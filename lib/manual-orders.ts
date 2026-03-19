import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ShippingType,
} from "@prisma/client"
import { decrementOrderItemStock } from "@/lib/order-stock"
import { buildVariantDisplayLabel } from "@/lib/pdv"
import {
  calculateOrderWeight,
  fetchMelhorEnvioServices,
  findLocalDeliveryZone,
  normalizePostalCode,
} from "@/lib/shipping"

export type ManualOrderItemInput = {
  productId: string
  productVariantId: string
  quantity: number
}

export type ManualOrderAddressInput = {
  addressStreet?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  addressNeighborhood?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressZip?: string | null
}

export type ManualOrderCreateInput = {
  userId: string
  customerNameSnapshot?: string | null
  customerEmailSnapshot?: string | null
  customerPhoneSnapshot?: string | null
  items: ManualOrderItemInput[]
  shippingType: ShippingType
  shippingServiceId?: string | null
  address: ManualOrderAddressInput
  paymentMethod: "CASH" | "MANUAL_PIX" | "POS_DEBIT" | "POS_CREDIT"
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED"
  paymentInstallments?: number | null
  manualPaymentReference?: string | null
  manualPaymentNotes?: string | null
  cashReceivedAmount?: number | null
}

const checkoutOrderSummarySelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  total: true,
  shippingType: true,
  shippingCarrier: true,
  shippingDeadline: true,
  cashReceivedAmount: true,
  changeAmount: true,
  createdAt: true,
})

export type CheckoutOrderSummaryRecord = Prisma.OrderGetPayload<{
  select: typeof checkoutOrderSummarySelect
}>

function decimalToNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return null
  }

  return typeof value === "number" ? value : value.toNumber()
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function normalizeAddress(address: ManualOrderAddressInput) {
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

function validateAddressForShipping(
  shippingType: ShippingType,
  address: ReturnType<typeof normalizeAddress>,
) {
  if (shippingType === ShippingType.PICKUP) {
    return
  }

  const requiredFields = [
    address.addressStreet,
    address.addressNumber,
    address.addressNeighborhood,
    address.addressCity,
    address.addressState,
    address.addressZip,
  ]

  if (requiredFields.some((field) => !field)) {
    throw new Error("Preencha o endereço de entrega completo.")
  }
}

export function serializeCheckoutOrderSummary(order: CheckoutOrderSummaryRecord) {
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total.toNumber(),
    shippingType: order.shippingType,
    shippingCarrier: order.shippingCarrier,
    shippingDeadline: order.shippingDeadline,
    cashReceivedAmount: decimalToNumber(order.cashReceivedAmount),
    changeAmount: decimalToNumber(order.changeAmount),
    createdAt: order.createdAt.toISOString(),
  }
}

export async function getCheckoutOrderSummary(
  prisma: PrismaClient,
  input: { orderId: string; userId: string },
) {
  const order = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      userId: input.userId,
    },
    select: checkoutOrderSummarySelect,
  })

  return order ? serializeCheckoutOrderSummary(order) : null
}

export async function createManualOrder(
  prisma: PrismaClient,
  input: ManualOrderCreateInput,
) {
  if (input.items.length === 0) {
    throw new Error("Adicione ao menos um item ao pedido.")
  }

  const normalizedAddress = normalizeAddress(input.address)
  validateAddressForShipping(input.shippingType, normalizedAddress)

  const variantIds = input.items.map((item) => item.productVariantId)
  const productIds = input.items.map((item) => item.productId)

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

  const orderItemsRecord: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = input.items.map((item) => {
    const variant = variantsById.get(item.productVariantId)

    if (!variant || variant.productId !== item.productId) {
      throw new Error("Um dos itens do pedido está com produto ou variação inválidos.")
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

  if (input.shippingType === ShippingType.PICKUP) {
    shippingCarrier = "Retirada na Loja"
    shippingDeadline = "Retirada imediata"
  }

  if (input.shippingType === ShippingType.LOCAL_DELIVERY) {
    const localZone = await findLocalDeliveryZone(
      prisma,
      normalizedAddress.addressCity ?? "",
      normalizedAddress.addressState,
    )

    if (!localZone) {
      throw new Error("A cidade informada não possui entrega local disponível.")
    }

    shippingCost = localZone.price
    shippingCarrier = "Entrega Local"
    shippingDeadline = localZone.deadlineText
  }

  if (input.shippingType === ShippingType.NATIONAL) {
    const destinationPostalCode = normalizePostalCode(normalizedAddress.addressZip ?? "")

    if (!destinationPostalCode || destinationPostalCode.length !== 8) {
      throw new Error("CEP inválido para entrega nacional.")
    }

    const weightKg = await calculateOrderWeight(
      prisma,
      input.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    )

    const availableServices = await fetchMelhorEnvioServices({
      toPostalCode: destinationPostalCode,
      weightKg,
    })

    if (availableServices.length === 0) {
      throw new Error("Nenhuma opção de frete nacional disponível para este pedido.")
    }

    const selectedService = availableServices.find((service) => service.id === input.shippingServiceId)

    if (!selectedService) {
      throw new Error("Selecione um serviço de frete válido para entrega nacional.")
    }

    shippingCost = selectedService.price
    shippingCarrier = selectedService.carrier
    shippingDeadline = selectedService.deliveryTime
    normalizedAddress.addressZip = destinationPostalCode
  }

  total += shippingCost

  const cashReceivedAmount =
    input.paymentMethod === PaymentMethod.CASH ? input.cashReceivedAmount ?? null : null

  if (
    input.paymentMethod === PaymentMethod.CASH &&
    cashReceivedAmount != null &&
    cashReceivedAmount < total
  ) {
    throw new Error("O valor informado em dinheiro não pode ser menor que o total do pedido.")
  }

  const computedChangeAmount =
    input.paymentMethod === PaymentMethod.CASH && cashReceivedAmount != null
      ? Number((cashReceivedAmount - total).toFixed(2))
      : null
  const changeAmount =
    input.paymentMethod === PaymentMethod.CASH
      ? computedChangeAmount != null && computedChangeAmount > 0
        ? computedChangeAmount
        : 0
      : null

  const createdOrder = await prisma.$transaction(async (tx) => {
    const stockItems = orderItemsRecord.map((item) => ({
      productId: item.productId,
      productVariantId: item.productVariantId ?? null,
      quantity: item.quantity,
    }))

    if (input.paymentStatus === PaymentStatus.PAID) {
      await decrementOrderItemStock(tx, stockItems)
    }

    return tx.order.create({
      data: {
        userId: input.userId,
        status: input.paymentStatus === PaymentStatus.PAID ? OrderStatus.PAID : OrderStatus.PENDING,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        paymentInstallments:
          input.paymentMethod === PaymentMethod.POS_CREDIT ? input.paymentInstallments ?? 1 : null,
        paidAt: input.paymentStatus === PaymentStatus.PAID ? new Date() : null,
        manualPaymentReference:
          input.paymentMethod === PaymentMethod.MANUAL_PIX ||
          input.paymentMethod === PaymentMethod.POS_DEBIT ||
          input.paymentMethod === PaymentMethod.POS_CREDIT
            ? input.manualPaymentReference ?? null
            : null,
        manualPaymentNotes: input.manualPaymentNotes ?? null,
        cashReceivedAmount,
        changeAmount,
        customerNameSnapshot: input.customerNameSnapshot ?? null,
        customerEmailSnapshot: input.customerEmailSnapshot ?? null,
        customerPhoneSnapshot: input.customerPhoneSnapshot ?? null,
        total,
        shippingType: input.shippingType,
        shippingCost,
        shippingCarrier,
        shippingDeadline,
        ...(input.shippingType !== ShippingType.PICKUP ? normalizedAddress : {}),
        items: {
          create: orderItemsRecord,
        },
      },
      select: checkoutOrderSummarySelect,
    })
  })

  return serializeCheckoutOrderSummary(createdOrder)
}
