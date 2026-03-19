import { NextResponse } from "next/server"
import { OrderStatus, PaymentMethod, PaymentStatus, ShippingType } from "@prisma/client"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { decrementOrderItemStock } from "@/lib/order-stock"
import { calculateOrderWeight, fetchMelhorEnvioServices, findLocalDeliveryZone, normalizePostalCode } from "@/lib/shipping"
import prisma from "@/lib/prisma"
import {
  buildVariantDisplayLabel,
  createPdvOrderSchema,
  ensurePdvWalkInCustomer,
  normalizePdvText,
} from "@/lib/pdv"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const payload = createPdvOrderSchema.parse(body)

    const [selectedCustomer, walkInCustomer] = await Promise.all([
      payload.customerId
        ? prisma.user.findUnique({
            where: { id: payload.customerId },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          })
        : Promise.resolve(null),
      payload.customerId ? Promise.resolve(null) : ensurePdvWalkInCustomer(prisma),
    ])

    if (payload.customerId && (!selectedCustomer || selectedCustomer.role !== "CUSTOMER")) {
      return NextResponse.json({ error: "Cliente inválido para a venda presencial." }, { status: 400 })
    }

    const customerId = selectedCustomer?.id ?? walkInCustomer?.id

    if (!customerId) {
      return NextResponse.json({ error: "Não foi possível resolver o cliente do pedido." }, { status: 500 })
    }

    const variantIds = payload.items.map((item) => item.productVariantId)
    const productIds = payload.items.map((item) => item.productId)

    const variants = await prisma.productVariant.findMany({
      where: {
        id: {
          in: variantIds,
        },
        productId: {
          in: productIds,
        },
        active: true,
        product: {
          active: true,
        },
      },
      include: {
        product: {
          include: {
            category: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
    })

    const variantsById = new Map(variants.map((variant) => [variant.id, variant]))
    let total = 0
    let shippingCost = 0
    let shippingCarrier: string | null = null
    let shippingDeadline: string | null = null
    const normalizedAddress = {
      addressStreet: normalizePdvText(payload.address.addressStreet),
      addressNumber: normalizePdvText(payload.address.addressNumber),
      addressComplement: normalizePdvText(payload.address.addressComplement),
      addressNeighborhood: normalizePdvText(payload.address.addressNeighborhood),
      addressCity: normalizePdvText(payload.address.addressCity),
      addressState: normalizePdvText(payload.address.addressState),
      addressZip: normalizePdvText(payload.address.addressZip),
    }

    const orderItemsRecord = payload.items.map((item) => {
      const variant = variantsById.get(item.productVariantId)

      if (!variant || variant.productId !== item.productId) {
        throw new Error("Um dos itens do PDV está com produto ou variação inválidos.")
      }

      if (item.quantity > variant.stock) {
        throw new Error(`Estoque insuficiente para ${variant.product.name}. Disponível: ${variant.stock}.`)
      }

      const priceToUse = variant.product.price.toNumber()
      const categoryName = variant.product.category.parent?.name ?? variant.product.category.name
      const subcategoryName = variant.product.category.parent ? variant.product.category.name : null
      total += priceToUse * item.quantity

      return {
        productId: variant.product.id,
        productVariantId: variant.id,
        quantity: item.quantity,
        price: priceToUse,
        unitPrice: priceToUse,
        unitCost: variant.product.costPrice?.toNumber() ?? null,
        selectedSize: variant.size,
        selectedColor: variant.color,
        selectedFlavor: variant.flavor,
        productNameSnapshot: variant.product.name,
        productSlugSnapshot: variant.product.slug,
        categoryNameSnapshot: categoryName,
        subcategoryNameSnapshot: subcategoryName,
        variantNameSnapshot: buildVariantDisplayLabel(variant),
      }
    })

    if (payload.shippingType === ShippingType.PICKUP) {
      shippingCarrier = "Retirada na Loja"
      shippingDeadline = "Retirada imediata"
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

      shippingCost = localZone.price
      shippingCarrier = "Entrega Local"
      shippingDeadline = localZone.deadlineText
    }

    if (payload.shippingType === ShippingType.NATIONAL) {
      const destinationPostalCode = normalizePostalCode(normalizedAddress.addressZip ?? "")

      if (!destinationPostalCode || destinationPostalCode.length !== 8) {
        return NextResponse.json({ error: "CEP inválido para entrega nacional." }, { status: 400 })
      }

      const weightKg = await calculateOrderWeight(
        prisma,
        payload.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      )

      const availableServices = await fetchMelhorEnvioServices({
        toPostalCode: destinationPostalCode,
        weightKg,
      })

      if (availableServices.length === 0) {
        return NextResponse.json(
          { error: "Nenhuma opção de frete nacional disponível para este pedido." },
          { status: 400 },
        )
      }

      const selectedService = availableServices.find((service) => service.id === payload.shippingServiceId)

      if (!selectedService) {
        return NextResponse.json(
          { error: "Selecione um serviço de frete válido para entrega nacional." },
          { status: 400 },
        )
      }

      shippingCost = selectedService.price
      shippingCarrier = selectedService.carrier
      shippingDeadline = selectedService.deliveryTime
      normalizedAddress.addressZip = destinationPostalCode
    }

    total += shippingCost

    const cashReceivedAmount =
      payload.paymentMethod === PaymentMethod.CASH ? payload.cashReceivedAmount : null
    const computedChangeAmount =
      payload.paymentMethod === PaymentMethod.CASH && cashReceivedAmount != null
        ? Number((cashReceivedAmount - total).toFixed(2))
        : null
    const changeAmount =
      payload.paymentMethod === PaymentMethod.CASH
        ? computedChangeAmount != null && computedChangeAmount > 0
          ? computedChangeAmount
          : 0
        : null

    if (
      payload.paymentMethod === PaymentMethod.CASH &&
      payload.paymentStatus === PaymentStatus.PAID &&
      cashReceivedAmount != null &&
      cashReceivedAmount < total
    ) {
      return NextResponse.json(
        { error: "O valor recebido em dinheiro não pode ser menor que o total do pedido." },
        { status: 400 },
      )
    }

    const createdOrder = await prisma.$transaction(async (tx) => {
      if (payload.paymentStatus === PaymentStatus.PAID) {
        await decrementOrderItemStock(tx, orderItemsRecord)
      }

      const customerNameSnapshot = payload.customerId
        ? selectedCustomer?.name ?? null
        : payload.customerName
      const customerEmailSnapshot = payload.customerId
        ? selectedCustomer?.email ?? null
        : payload.customerEmail
      const customerPhoneSnapshot = payload.customerId
        ? selectedCustomer?.phone ?? null
        : payload.customerPhone

      return tx.order.create({
        data: {
          userId: customerId,
          status: payload.paymentStatus === PaymentStatus.PAID ? OrderStatus.PAID : OrderStatus.PENDING,
          paymentMethod: payload.paymentMethod,
          paymentStatus: payload.paymentStatus,
          paymentInstallments:
            payload.paymentMethod === PaymentMethod.POS_CREDIT ? payload.paymentInstallments ?? 1 : null,
          paidAt: payload.paymentStatus === PaymentStatus.PAID ? new Date() : null,
          manualPaymentReference:
            payload.paymentMethod === PaymentMethod.MANUAL_PIX ||
            payload.paymentMethod === PaymentMethod.POS_DEBIT ||
            payload.paymentMethod === PaymentMethod.POS_CREDIT
              ? payload.manualPaymentReference
              : null,
          manualPaymentNotes: payload.manualPaymentNotes,
          cashReceivedAmount,
          changeAmount,
          customerNameSnapshot,
          customerEmailSnapshot,
          customerPhoneSnapshot,
          total,
          shippingType: payload.shippingType,
          shippingCost,
          shippingCarrier,
          shippingDeadline,
          ...(payload.shippingType !== ShippingType.PICKUP ? normalizedAddress : {}),
          items: {
            create: orderItemsRecord,
          },
        },
        select: {
          id: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
        },
      })
    })

    return NextResponse.json(createdOrder, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Erro de validação no PDV:", error.issues)
      return NextResponse.json({ error: error.issues[0]?.message ?? "Payload inválido." }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Erro ao criar pedido no PDV:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
