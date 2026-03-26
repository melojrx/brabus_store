import { NextResponse } from "next/server"
import { OrderChannel, PaymentMethod, PaymentStatus, Prisma, ShippingType } from "@prisma/client"
import type Stripe from "stripe"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { createManualOrder } from "@/lib/manual-orders"
import prisma from "@/lib/prisma"
import {
  buildVariantLabel,
  createPublicCheckoutSchema,
  normalizePostalCode,
  type PublicCheckoutPayload,
  resolveVariant,
} from "@/lib/public-checkout"
import { fetchMelhorEnvioServices, findLocalDeliveryZone } from "@/lib/shipping"
import {
  inferOrderPaymentMethodFromCheckoutConfig,
  getStripeCheckoutPaymentMethodTypes,
  getStripeServerClient,
  isStripeTestEnvironmentConfigured,
} from "@/lib/stripe"
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

    if (payload.paymentMethod === "MANUAL_PIX") {
      const storeSettings = await getPublicStoreSettings()

      if (!storeSettings.pixKey) {
        return NextResponse.json(
          { error: "O Pix manual ainda não está disponível neste ambiente." },
          { status: 400 },
        )
      }
    }

    const products = await loadCheckoutProducts(payload.items.map((item) => item.productId))
    const resolvedItems = resolveCheckoutItems(products, payload.items)

    if (payload.paymentMethod === "STRIPE_CARD") {
      if (!isStripeTestEnvironmentConfigured()) {
        return NextResponse.json(
          { error: "Stripe de teste ainda não configurado neste ambiente." },
          { status: 503 },
        )
      }

      const stripe = getStripeServerClient()
      const configuredPaymentMethods = getStripeCheckoutPaymentMethodTypes()
      let total = 0
      let totalWeightKg = 0
      const orderItemsRecord: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = []
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

      for (const item of resolvedItems) {
        const priceToUse = item.product.price.toNumber()
        const unitCost = item.product.costPrice?.toNumber() ?? null
        const categoryName = item.product.category.parent?.name ?? item.product.category.name
        const subcategoryName = item.product.category.parent ? item.product.category.name : null

        total += priceToUse * item.quantity
        totalWeightKg += (item.product.weightKg ?? 0.5) * item.quantity

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

        lineItems.push({
          price_data: {
            currency: "brl",
            product_data: {
              name: item.variantLabel ? `${item.product.name} (${item.variantLabel})` : item.product.name,
            },
            unit_amount: Math.round(priceToUse * 100),
          },
          quantity: item.quantity,
        })
      }

      let resolvedShippingCost = 0
      let resolvedShippingCarrier: string | null = null
      let resolvedShippingDeadline: string | null = null

      if (payload.shippingType === ShippingType.PICKUP) {
        resolvedShippingCarrier = "Retirada na Loja"
        resolvedShippingDeadline = "Retirada imediata"
      }

      if (payload.shippingType === ShippingType.LOCAL_DELIVERY) {
        const localZone = await findLocalDeliveryZone(
          prisma,
          normalizedAddress.addressCity ?? "",
          normalizedAddress.addressState,
        )

        if (!localZone) {
          return NextResponse.json(
            { error: "A cidade informada não possui entrega local disponível." },
            { status: 400 },
          )
        }

        resolvedShippingCost = localZone.price
        resolvedShippingCarrier = "Entrega Local"
        resolvedShippingDeadline = localZone.deadlineText
      }

      if (payload.shippingType === ShippingType.NATIONAL) {
        if (!normalizedAddress.addressZip) {
          return NextResponse.json({ error: "CEP inválido para frete nacional." }, { status: 400 })
        }

        const availableServices = await fetchMelhorEnvioServices({
          toPostalCode: normalizedAddress.addressZip,
          weightKg: totalWeightKg,
        })

        const selectedService = availableServices.find((service) => service.id === payload.shippingServiceId)

        if (!selectedService) {
          return NextResponse.json(
            { error: "O serviço de frete selecionado não está mais disponível para este CEP." },
            { status: 400 },
          )
        }

        resolvedShippingCost = selectedService.price
        resolvedShippingCarrier = selectedService.carrier
        resolvedShippingDeadline = selectedService.deliveryTime
      }

      total += resolvedShippingCost

      if (resolvedShippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: "brl",
            product_data: {
              name: `Custo de Envio (${resolvedShippingCarrier ?? "Entrega"})`,
            },
            unit_amount: Math.round(resolvedShippingCost * 100),
          },
          quantity: 1,
        })
      }

      const order = await prisma.order.create({
        data: {
          userId,
          channel: OrderChannel.ONLINE,
          paymentMethod: inferOrderPaymentMethodFromCheckoutConfig(configuredPaymentMethods),
          paymentStatus: PaymentStatus.PENDING,
          total,
          customerNameSnapshot: sessionAuth.user?.name ?? null,
          customerEmailSnapshot: sessionAuth.user?.email ?? null,
          customerPhoneSnapshot: sessionAuth.user?.phone ?? null,
          shippingType: payload.shippingType,
          shippingCost: resolvedShippingCost,
          shippingCarrier: resolvedShippingCarrier,
          shippingDeadline: resolvedShippingDeadline,
          ...(payload.shippingType !== ShippingType.PICKUP ? normalizedAddress : {}),
          items: {
            create: orderItemsRecord,
          },
        },
      })

      const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: configuredPaymentMethods,
        line_items: lineItems,
        mode: "payment",
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancel`,
        client_reference_id: order.id,
        customer_email: sessionAuth.user?.email ?? undefined,
        locale: "pt-BR",
        billing_address_collection: "auto",
        phone_number_collection: {
          enabled: true,
        },
        metadata: {
          orderId: order.id,
          userId,
          shippingType: payload.shippingType,
        },
      })

      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: stripeSession.id },
      })

      return NextResponse.json({ sessionId: stripeSession.id, url: stripeSession.url })
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
      shippingServiceId: payload.shippingServiceId,
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

    if (
      typeof error === "object" &&
      error !== null &&
      "param" in error &&
      error.param === "payment_method_types"
    ) {
      return NextResponse.json(
        {
          error:
            "Os metodos de pagamento configurados na Stripe nao estao habilitados nesta conta de teste. Verifique STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES e as configuracoes da conta Stripe.",
        },
        { status: 400 },
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: "Erro ao processar checkout" }, { status: 500 })
  }
}
