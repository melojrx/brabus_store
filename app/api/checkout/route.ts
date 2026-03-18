import { NextResponse } from "next/server"
import { ShippingType, Prisma } from "@prisma/client"
import type Stripe from "stripe"
import { auth } from "@/auth"
import { fetchMelhorEnvioServices, findLocalDeliveryZone, normalizePostalCode } from "@/lib/shipping"
import prisma from "@/lib/prisma"
import {
  getStripeCheckoutPaymentMethodTypes,
  getStripeServerClient,
  isStripeTestEnvironmentConfigured,
} from "@/lib/stripe"

type CheckoutItemInput = {
  productId: string
  productName?: string
  productVariantId?: string | null
  quantity: number
  selectedSize?: string | null
  selectedColor?: string | null
  selectedFlavor?: string | null
}

type CheckoutAddressInput = {
  addressStreet?: unknown
  addressNumber?: unknown
  addressComplement?: unknown
  addressNeighborhood?: unknown
  addressCity?: unknown
  addressState?: unknown
  addressZip?: unknown
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function isShippingType(value: unknown): value is ShippingType {
  return value === ShippingType.PICKUP || value === ShippingType.NATIONAL || value === ShippingType.LOCAL_DELIVERY
}

function resolveVariant(
  variants: Array<{
    id: string
    name: string | null
    size: string | null
    color: string | null
    flavor: string | null
    stock: number
    active: boolean
  }>,
  item: CheckoutItemInput,
) {
  const activeVariants = variants.filter((variant) => variant.active)

  if (activeVariants.length === 0) {
    return null
  }

  if (item.productVariantId) {
    return activeVariants.find((variant) => variant.id === item.productVariantId) ?? null
  }

  if (activeVariants.length === 1) {
    return activeVariants[0]
  }

  const selectedSize = normalizeText(item.selectedSize)
  const selectedColor = normalizeText(item.selectedColor)
  const selectedFlavor = normalizeText(item.selectedFlavor)

  const requiresSize = new Set(activeVariants.map((variant) => variant.size).filter(Boolean)).size > 1
  const requiresColor = new Set(activeVariants.map((variant) => variant.color).filter(Boolean)).size > 1
  const requiresFlavor = new Set(activeVariants.map((variant) => variant.flavor).filter(Boolean)).size > 1

  if ((requiresSize && !selectedSize) || (requiresColor && !selectedColor) || (requiresFlavor && !selectedFlavor)) {
    return null
  }

  return (
    activeVariants.find(
      (variant) =>
        (!selectedSize || variant.size === selectedSize) &&
        (!selectedColor || variant.color === selectedColor) &&
        (!selectedFlavor || variant.flavor === selectedFlavor),
    ) ?? null
  )
}

function buildVariantLabel(item: CheckoutItemInput, variantName: string | null) {
  const parts = [
    variantName && variantName !== "Default" ? variantName : null,
    normalizeText(item.selectedSize),
    normalizeText(item.selectedColor),
    normalizeText(item.selectedFlavor),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" / ") : null
}

function normalizeAddress(address: CheckoutAddressInput) {
  return {
    addressStreet: normalizeText(address.addressStreet),
    addressNumber: normalizeText(address.addressNumber),
    addressComplement: normalizeText(address.addressComplement),
    addressNeighborhood: normalizeText(address.addressNeighborhood),
    addressCity: normalizeText(address.addressCity),
    addressState: normalizeText(address.addressState),
    addressZip: normalizeText(address.addressZip),
  }
}

function validateRequiredAddressFields(address: ReturnType<typeof normalizeAddress>) {
  const missingFields: string[] = []

  if (!address.addressStreet) missingFields.push("rua")
  if (!address.addressNumber) missingFields.push("numero")
  if (!address.addressNeighborhood) missingFields.push("bairro")
  if (!address.addressCity) missingFields.push("cidade")
  if (!address.addressState) missingFields.push("estado")
  if (!address.addressZip) missingFields.push("CEP")

  return missingFields
}

export async function POST(req: Request) {
  try {
    if (!isStripeTestEnvironmentConfigured()) {
      return NextResponse.json(
        { error: "Stripe de teste ainda não configurado neste ambiente." },
        { status: 503 },
      )
    }

    const stripe = getStripeServerClient()
    const sessionAuth = await auth()
    const userId = sessionAuth?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Você precisa estar logado para finalizar a compra." }, { status: 401 })
    }

    const body = await req.json()
    const rawItems = Array.isArray(body.items) ? (body.items as CheckoutItemInput[]) : []
    const shippingType = body.shippingType
    const shippingServiceId = normalizeText(body.shippingServiceId)
    const addressInput = typeof body.address === "object" && body.address ? (body.address as CheckoutAddressInput) : {}
    const normalizedAddress = normalizeAddress(addressInput)
    const normalizedAddressZip = normalizedAddress.addressZip ? normalizePostalCode(normalizedAddress.addressZip) : null

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Carrinho está vazio." }, { status: 400 })
    }

    if (!isShippingType(shippingType)) {
      return NextResponse.json({ error: "Tipo de entrega inválido." }, { status: 400 })
    }

    if (shippingType !== ShippingType.PICKUP) {
      const missingFields = validateRequiredAddressFields(normalizedAddress)

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: `Preencha o endereço de entrega: ${missingFields.join(", ")}.`,
          },
          { status: 400 },
        )
      }
    }

    const products = await Promise.all(
      rawItems.map((item) =>
        prisma.product.findUnique({
          where: { id: item.productId },
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

    let total = 0
    let totalWeightKg = 0
    const orderItemsRecord: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = []
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    for (const [index, item] of rawItems.entries()) {
      const product = products[index]

      if (!product) {
        return NextResponse.json({ error: `Produto ${item.productId} não encontrado.` }, { status: 404 })
      }

      const quantity = Number(item.quantity)
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json({ error: `Quantidade inválida para o produto ${product.name}.` }, { status: 400 })
      }

      const variant = resolveVariant(product.variants, item)
      if (!variant) {
        return NextResponse.json(
          {
            error: `Produto ${product.name} está sem variante ativa válida para venda.`,
          },
          { status: 400 },
        )
      }

      const availableStock = variant.stock

      if (quantity > availableStock) {
        return NextResponse.json(
          {
            error: `Estoque insuficiente para o produto ${product.name}. Disponível: ${availableStock}`,
          },
          { status: 400 },
        )
      }

      const priceToUse = product.price.toNumber()
      const unitCost = product.costPrice?.toNumber() ?? null
      totalWeightKg += (product.weightKg ?? 0.5) * quantity
      const categoryName = product.category.parent?.name ?? product.category.name
      const subcategoryName = product.category.parent ? product.category.name : null
      const selectedSize = variant?.size ?? normalizeText(item.selectedSize)
      const selectedColor = variant?.color ?? normalizeText(item.selectedColor)
      const selectedFlavor = variant?.flavor ?? normalizeText(item.selectedFlavor)
      const variantName = variant?.name ?? null
      const variantLabel = buildVariantLabel(
        {
          ...item,
          selectedSize,
          selectedColor,
          selectedFlavor,
        },
        variantName,
      )

      total += priceToUse * quantity

      orderItemsRecord.push({
        productId: product.id,
        productVariantId: variant.id,
        quantity,
        price: priceToUse,
        unitPrice: priceToUse,
        unitCost,
        selectedSize,
        selectedColor,
        selectedFlavor,
        productNameSnapshot: product.name,
        productSlugSnapshot: product.slug,
        categoryNameSnapshot: categoryName,
        subcategoryNameSnapshot: subcategoryName,
        variantNameSnapshot: variantName,
      })

      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: variantLabel ? `${product.name} (${variantLabel})` : product.name,
          },
          unit_amount: Math.round(priceToUse * 100),
        },
        quantity,
      })
    }

    let resolvedShippingCost = 0
    let resolvedShippingCarrier: string | null = null
    let resolvedShippingDeadline: string | null = null

    if (shippingType === ShippingType.PICKUP) {
      resolvedShippingCarrier = "Retirada na Loja"
      resolvedShippingDeadline = "Retirada imediata"
    }

    if (shippingType === ShippingType.LOCAL_DELIVERY) {
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

    if (shippingType === ShippingType.NATIONAL) {
      if (!normalizedAddressZip) {
        return NextResponse.json({ error: "CEP inválido para frete nacional." }, { status: 400 })
      }

      if (!shippingServiceId) {
        return NextResponse.json({ error: "Selecione uma transportadora para o envio nacional." }, { status: 400 })
      }

      const availableServices = await fetchMelhorEnvioServices({
        toPostalCode: normalizedAddressZip,
        weightKg: totalWeightKg,
      })

      const selectedService = availableServices.find((service) => service.id === shippingServiceId)

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

    normalizedAddress.addressZip = normalizedAddressZip
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
        total,
        shippingType,
        shippingCost: resolvedShippingCost,
        shippingCarrier: resolvedShippingCarrier,
        shippingDeadline: resolvedShippingDeadline,
        ...(shippingType !== ShippingType.PICKUP ? normalizedAddress : {}),
        items: {
          create: orderItemsRecord,
        },
      },
    })

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: getStripeCheckoutPaymentMethodTypes(),
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
        shippingType,
      },
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: stripeSession.id },
    })

    return NextResponse.json({ sessionId: stripeSession.id, url: stripeSession.url })
  } catch (error) {
    console.error("Erro no checkout:", error)

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

    return NextResponse.json({ error: "Erro ao processar checkout" }, { status: 500 })
  }
}
