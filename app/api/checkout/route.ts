import { NextResponse } from "next/server"
import { OrderChannel, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { createManualOrder } from "@/lib/manual-orders"
import { allocateOrderNumber } from "@/lib/order-number-service"
import prisma from "@/lib/prisma"
import {
  buildVariantLabel,
  createPublicCheckoutSchema,
  normalizePostalCode,
  type PublicCheckoutPayload,
  resolveVariant,
} from "@/lib/public-checkout"
import { DeliveryPolicyError, resolveDelivery } from "@/lib/delivery-policy"
import { getMercadoPagoClient, isMercadoPagoConfigured } from "@/lib/mercadopago/client"
import { buildCheckoutProPreference } from "@/lib/mercadopago/checkout-pro"
import { getMercadoPagoSettings } from "@/lib/mercadopago/settings"
import { getPublicStoreSettings } from "@/lib/store-settings"

type ProductRecord = Prisma.ProductGetPayload<{
  include: {
    category: {
      include: {
        parent: true
      }
    }
    variants: true
  }
}>

type ResolvedCheckoutItem = {
  product: ProductRecord
  variant: {
    id: string
    name: string | null
    size: string | null
    color: string | null
    flavor: string | null
    stock: number
    active: boolean
  }
  quantity: number
  selectedSize: string | null
  selectedColor: string | null
  selectedFlavor: string | null
  variantLabel: string | null
}

function getConfiguredCheckoutOrigin() {
  const origin = process.env.NEXTAUTH_URL?.trim()

  if (!origin) {
    throw Object.assign(new Error("NEXTAUTH_URL não configurada para o checkout."), { status: 503 })
  }

  let url: URL

  try {
    url = new URL(origin)
  } catch {
    throw Object.assign(new Error("NEXTAUTH_URL inválida para o checkout."), { status: 503 })
  }

  if (process.env.NODE_ENV !== "development" && url.protocol !== "https:") {
    throw Object.assign(new Error("NEXTAUTH_URL deve usar HTTPS fora do ambiente de desenvolvimento."), { status: 503 })
  }

  return url.origin
}

function getMercadoPagoInitPoint(preferenceResponse: {
  init_point?: string | null
  sandbox_init_point?: string | null
}) {
  return preferenceResponse.init_point ?? preferenceResponse.sandbox_init_point
}

function getCheckoutErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>

    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message
    }
  }

  return "Erro ao processar checkout"
}

function getCheckoutErrorStatus(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>

    if (typeof candidate.status === "number" && candidate.status >= 400 && candidate.status < 600) {
      return candidate.status
    }
  }

  return 400
}

async function loadCheckoutProducts(productIds: string[]) {
  return Promise.all(
    productIds.map((productId) =>
      prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: {
            include: {
              parent: true,
            },
          },
          variants: {
            orderBy: [{ createdAt: "asc" }],
          },
        },
      }),
    ),
  )
}

function resolveCheckoutItems(
  products: Array<ProductRecord | null>,
  items: PublicCheckoutPayload["items"],
) {
  const resolvedItems: ResolvedCheckoutItem[] = []

  for (const [index, item] of items.entries()) {
    const product = products[index]

    if (!product) {
      throw new Error(`Produto ${item.productId} não encontrado.`)
    }

    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Quantidade inválida para o produto ${product.name}.`)
    }

    const variant = resolveVariant(product.variants, item)
    if (!variant) {
      throw new Error(`Produto ${product.name} está sem variante ativa válida para venda.`)
    }

    if (quantity > variant.stock) {
      throw new Error(`Estoque insuficiente para o produto ${product.name}. Disponível: ${variant.stock}`)
    }

    const selectedSize = variant.size ?? item.selectedSize ?? null
    const selectedColor = variant.color ?? item.selectedColor ?? null
    const selectedFlavor = variant.flavor ?? item.selectedFlavor ?? null
    const variantLabel = buildVariantLabel(
      {
        ...item,
        selectedSize,
        selectedColor,
        selectedFlavor,
      },
      variant.name ?? null,
    )

    resolvedItems.push({
      product,
      variant,
      quantity,
      selectedSize,
      selectedColor,
      selectedFlavor,
      variantLabel,
    })
  }

  return resolvedItems
}

export async function POST(req: Request) {
  try {
    const sessionAuth = await auth()
    const userId = sessionAuth?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Você precisa estar logado para finalizar a compra." }, { status: 401 })
    }

    const body = await req.json()
    const payload = createPublicCheckoutSchema.parse(body)
    const normalizedAddress = {
      ...payload.address,
      addressZip: payload.address.addressZip ? normalizePostalCode(payload.address.addressZip) : null,
    }
    const storeSettings = await getPublicStoreSettings()
    const delivery = resolveDelivery({
      shippingType: payload.shippingType,
      address: normalizedAddress,
      store: storeSettings,
    })

    if (payload.paymentMethod === "MANUAL_PIX") {
      if (!storeSettings.pixKey) {
        return NextResponse.json(
          { error: "O Pix manual ainda não está disponível neste ambiente." },
          { status: 400 },
        )
      }
    }

    const products = await loadCheckoutProducts(payload.items.map((item) => item.productId))
    const resolvedItems = resolveCheckoutItems(products, payload.items)

    if (
      payload.paymentMethod === "MERCADO_PAGO_CARD" ||
      payload.paymentMethod === "MERCADO_PAGO_PIX"
    ) {
      const mercadoPagoSettings = await getMercadoPagoSettings()

      if (!isMercadoPagoConfigured(mercadoPagoSettings.accessToken)) {
        return NextResponse.json(
          { error: "Mercado Pago não configurado neste ambiente." },
          { status: 503 },
        )
      }

      const { preference } = getMercadoPagoClient(mercadoPagoSettings.accessToken)
      const origin = getConfiguredCheckoutOrigin()
      let total = delivery.cost
      const orderItemsRecord: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = []

      for (const item of resolvedItems) {
        const priceToUse = item.product.price.toNumber()
        const unitCost = item.product.costPrice?.toNumber() ?? null
        const categoryName = item.product.category.parent?.name ?? item.product.category.name
        const subcategoryName = item.product.category.parent ? item.product.category.name : null

        total += priceToUse * item.quantity

        orderItemsRecord.push({
          productId: item.product.id,
          productVariantId: item.variant.id,
          quantity: item.quantity,
          price: priceToUse,
          unitPrice: priceToUse,
          unitCost,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          selectedFlavor: item.selectedFlavor,
          productNameSnapshot: item.product.name,
          productSlugSnapshot: item.product.slug,
          categoryNameSnapshot: categoryName,
          subcategoryNameSnapshot: subcategoryName,
          variantNameSnapshot: item.variant.name ?? null,
        })
      }

      const order = await prisma.$transaction(async (tx) => {
        const orderCreatedAt = new Date()
        const { orderNumber } = await allocateOrderNumber(tx, {
          channel: OrderChannel.ONLINE,
          createdAt: orderCreatedAt,
        })

        return tx.order.create({
          data: {
            userId,
            channel: OrderChannel.ONLINE,
            paymentMethod: payload.paymentMethod,
            paymentStatus: PaymentStatus.PENDING,
            createdAt: orderCreatedAt,
            orderNumber,
            total,
            customerNameSnapshot: sessionAuth.user?.name ?? null,
            customerEmailSnapshot: sessionAuth.user?.email ?? null,
            customerPhoneSnapshot: sessionAuth.user?.phone ?? null,
            shippingType: payload.shippingType,
            shippingCost: delivery.cost,
            shippingCarrier: delivery.carrier,
            shippingDeadline: delivery.deadline,
            ...(payload.shippingType !== "PICKUP" ? normalizedAddress : {}),
            items: {
              create: orderItemsRecord,
            },
          },
        })
      })

      const preferenceResponse = await preference.create({
        body: buildCheckoutProPreference({
          orderId: order.id,
          orderNumber: order.orderNumber ?? "",
          userId,
          email: sessionAuth.user?.email,
          paymentMethod: payload.paymentMethod,
          origin,
          items: resolvedItems.map((item) => ({
            id: item.variant.id,
            title: item.variantLabel
              ? `${item.product.name} (${item.variantLabel})`
              : item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price.toNumber(),
          })),
        }),
      })

      await prisma.order.update({
        where: { id: order.id },
        data: { mercadoPagoPreferenceId: preferenceResponse.id },
      })

      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        initPoint: getMercadoPagoInitPoint(preferenceResponse),
      })
    }

    const manualOrder = await createManualOrder(prisma, {
      userId,
      channel: OrderChannel.ONLINE,
      customerNameSnapshot: sessionAuth.user?.name ?? null,
      customerEmailSnapshot: sessionAuth.user?.email ?? null,
      customerPhoneSnapshot: sessionAuth.user?.phone ?? null,
      items: resolvedItems.map((item) => ({
        productId: item.product.id,
        productVariantId: item.variant.id,
        quantity: item.quantity,
      })),
      shippingType: payload.shippingType,
      address: normalizedAddress,
      paymentMethod:
        payload.paymentMethod === "CASH"
          ? PaymentMethod.CASH
          : PaymentMethod.MANUAL_PIX,
      paymentStatus: PaymentStatus.PENDING,
      cashReceivedAmount: payload.cashReceivedAmount,
    })

    return NextResponse.json({
      orderId: manualOrder.id,
      orderNumber: manualOrder.orderNumber,
      redirectUrl: `/checkout/success?order_id=${manualOrder.id}`,
    })
  } catch (error) {
    console.error("Erro no checkout:", error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      )
    }

    if (error instanceof DeliveryPolicyError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: getCheckoutErrorMessage(error) },
      { status: getCheckoutErrorStatus(error) },
    )
  }
}
