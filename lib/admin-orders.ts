import { CustomerReceivableStatus, OrderChannel, OrderStatus, PaymentMethod, PaymentStatus, Prisma, PrismaClient } from "@prisma/client"
import { z } from "zod"
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  type AdminOrderStatusFilter,
  type OrderStatusValue,
  ORDER_STATUS_VALUES,
  parseAdminOrderStatusFilter,
} from "@/lib/order-status"
import {
  PAYMENT_METHOD_VALUES,
  PAYMENT_STATUS_VALUES,
  type PaymentMethodValue,
  type PaymentStatusValue,
} from "@/lib/payment-status"
import { PDV_WALK_IN_CUSTOMER_EMAIL } from "@/lib/pdv"

export const ADMIN_ORDERS_PAGE_SIZE = 12
export const ADMIN_ORDER_MANUAL_STATUS_OPTIONS = ADMIN_ORDER_STATUS_OPTIONS.filter(
  (option) => option.value !== "ALL" && option.value !== "CANCELLED" && option.value !== "REFUNDED",
)

const NON_CANCELLABLE_ORDER_STATUSES = new Set<OrderStatusValue>([
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
])

const FINALIZED_PAYMENT_STATUSES = new Set<PaymentStatusValue>(["CANCELLED", "REFUNDED"])

const adminOrderListInclude = Prisma.validator<Prisma.OrderInclude>()({
  user: {
    select: {
      name: true,
      email: true,
      phone: true,
    },
  },
  customer: {
    select: {
      name: true,
      email: true,
      phone: true,
    },
  },
  receivable: { select: { openAmount: true, status: true } },
})

const adminOrderDetailInclude = Prisma.validator<Prisma.OrderInclude>()({
  user: {
    select: {
      name: true,
      email: true,
      phone: true,
    },
  },
  customer: {
    select: {
      name: true,
      email: true,
      phone: true,
    },
  },
  items: {
    include: {
      product: {
        select: {
          name: true,
          images: true,
          slug: true,
        },
      },
    },
  },
})

type AdminOrderListRecord = Prisma.OrderGetPayload<{
  include: typeof adminOrderListInclude
}>

export type AdminOrderDetailRecord = Prisma.OrderGetPayload<{
  include: typeof adminOrderDetailInclude
}>

type AdminOrdersClient = Pick<PrismaClient, "order">
type AdminOrderDetailClient = Pick<PrismaClient, "order">

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
})

export const updateOrderTrackingSchema = z.object({
  trackingCode: z
    .string()
    .trim()
    .max(100, "O código de rastreio deve ter no máximo 100 caracteres.")
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (!value) {
        return null
      }

      return value.trim()
    }),
})

function optionalTrimmedString(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((value) => {
      if (!value) {
        return null
      }

      return value.trim()
    })
}

const optionalMoneyField = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value == null || value === "") {
      return null
    }

    const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."))

    if (!Number.isFinite(parsed) || parsed < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valor monetário inválido.",
      })
      return z.NEVER
    }

    return Number(parsed.toFixed(2))
  })

export const updateOrderPaymentSchema = z
  .object({
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    paymentStatus: z.enum(PAYMENT_STATUS_VALUES),
    paymentInstallments: z
      .union([z.number().int(), z.string(), z.null(), z.undefined()])
      .transform((value, ctx) => {
        if (value == null || value === "") {
          return null
        }

        const parsed = typeof value === "number" ? value : Number.parseInt(value, 10)

        if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 12) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe um parcelamento válido entre 1 e 12x.",
          })
          return z.NEVER
        }

        return parsed
      }),
    manualPaymentReference: optionalTrimmedString(120, "A referência deve ter no máximo 120 caracteres."),
    manualPaymentNotes: optionalTrimmedString(1000, "As observações devem ter no máximo 1000 caracteres."),
    cashReceivedAmount: optionalMoneyField,
    changeAmount: optionalMoneyField,
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "MANUAL_PIX" && data.paymentStatus === "PAID" && !data.manualPaymentReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a referência do Pix manual antes de marcar como pago.",
        path: ["manualPaymentReference"],
      })
    }

    if (data.paymentMethod === "POS_CREDIT" && !data.paymentInstallments) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o número de parcelas para cartão de crédito.",
        path: ["paymentInstallments"],
      })
    }
  })

function decimalToNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return 0
  }

  return typeof value === "number" ? value : value.toNumber()
}

export type AdminOrdersFilters = {
  page: number
  status: AdminOrderStatusFilter
  q: string
  from: string | null
  to: string | null
  channel: "ALL" | OrderChannel
  paymentMethod: "ALL" | PaymentMethod
  paymentStatus: "ALL" | PaymentStatus
  receivableStatus: "ALL" | CustomerReceivableStatus
}

function buildAdminOrdersWhere(filters: AdminOrdersFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {}
  if (filters.status !== "ALL") where.status = filters.status
  if (filters.channel !== "ALL") where.channel = filters.channel
  if (filters.paymentMethod !== "ALL") where.paymentMethod = filters.paymentMethod
  if (filters.paymentStatus !== "ALL") where.paymentStatus = filters.paymentStatus
  if (filters.receivableStatus !== "ALL") where.receivable = { status: filters.receivableStatus }
  if (filters.from || filters.to) where.createdAt = { ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00`) } : {}), ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999`) } : {}) }
  if (filters.q) where.OR = [
    { orderNumber: { contains: filters.q, mode: "insensitive" } },
    { customerNameSnapshot: { contains: filters.q, mode: "insensitive" } },
    { customerPhoneSnapshot: { contains: filters.q, mode: "insensitive" } },
    { customer: { is: { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { phone: { contains: filters.q, mode: "insensitive" } }] } } },
    { user: { is: { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { phone: { contains: filters.q, mode: "insensitive" } }] } } },
  ]
  return where
}

export function normalizeOrdersPage(value: string | null | undefined) {
  const parsed = Number.parseInt(value || "1", 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function normalizeOrdersPageSize(value: number | null | undefined) {
  if (!value || value <= 0) {
    return ADMIN_ORDERS_PAGE_SIZE
  }

  return Math.min(value, 50)
}

export function serializeAdminOrderListItem(order: AdminOrderListRecord) {
  const customer = order.customer ?? order.user
  const customerEmail =
    order.customerEmailSnapshot ??
    (customer?.email === PDV_WALK_IN_CUSTOMER_EMAIL ? "Não informado" : customer?.email ?? "Não informado")

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerNameSnapshot ?? customer?.name ?? "Cliente não informado",
    customerEmail,
    customerPhone: order.customerPhoneSnapshot ?? customer?.phone ?? null,
    createdAt: order.createdAt.toISOString(),
    total: decimalToNumber(order.total),
    status: order.status as OrderStatusValue,
    paymentMethod: order.paymentMethod as PaymentMethodValue,
    paymentStatus: order.paymentStatus as PaymentStatusValue,
    shippingType: order.shippingType,
    shippingCarrier: order.shippingCarrier,
    trackingCode: order.trackingCode,
    receivableOpenAmount: order.receivable ? decimalToNumber(order.receivable.openAmount) : null,
    receivableStatus: order.receivable?.status ?? null,
  }
}

export async function getAdminOrders(
  prisma: AdminOrdersClient,
  options?: {
    page?: number
    pageSize?: number
    status?: AdminOrderStatusFilter
    filters?: AdminOrdersFilters
  },
) {
  const filters = options?.filters ?? {
    page: Math.max(1, options?.page ?? 1), status: options?.status ?? "ALL", q: "", from: null, to: null,
    channel: "ALL", paymentMethod: "ALL", paymentStatus: "ALL", receivableStatus: "ALL",
  }
  const page = filters.page
  const pageSize = normalizeOrdersPageSize(options?.pageSize)
  const status = filters.status
  const where = buildAdminOrdersWhere(filters)

  const [totalItems, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: adminOrderListInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    filters: {
      ...filters,
    },
    items: orders.map(serializeAdminOrderListItem),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  }
}

export async function getAdminOrderDetail(prisma: AdminOrderDetailClient, id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: adminOrderDetailInclude,
  })
}

export function parseAdminOrdersQuery(searchParams: URLSearchParams) {
  const enumValue = <T extends readonly string[]>(value: string | null, values: T) => value && values.includes(value) ? value as T[number] : "ALL" as const
  return {
    page: normalizeOrdersPage(searchParams.get("page")),
    status: parseAdminOrderStatusFilter(searchParams.get("status")),
    q: searchParams.get("q")?.trim() ?? "",
    from: searchParams.get("from") || null,
    to: searchParams.get("to") || null,
    channel: enumValue(searchParams.get("channel"), ["ONLINE", "PDV", "LEGACY"] as const),
    paymentMethod: enumValue(searchParams.get("paymentMethod"), PAYMENT_METHOD_VALUES),
    paymentStatus: enumValue(searchParams.get("paymentStatus"), PAYMENT_STATUS_VALUES),
    receivableStatus: enumValue(searchParams.get("receivableStatus"), ["OPEN", "PARTIAL", "SETTLED", "CANCELLED"] as const),
  }
}

export function getNextOperationalStatusForPayment(
  currentStatus: OrderStatus,
  nextPaymentStatus: PaymentStatus,
) {
  if (nextPaymentStatus === PaymentStatus.PAID && currentStatus === OrderStatus.PENDING) {
    return OrderStatus.PAID
  }

  if (nextPaymentStatus === PaymentStatus.FAILED && currentStatus === OrderStatus.PENDING) {
    return OrderStatus.FAILED
  }

  if (nextPaymentStatus === PaymentStatus.CANCELLED && currentStatus === OrderStatus.PENDING) {
    return OrderStatus.CANCELLED
  }

  if (nextPaymentStatus === PaymentStatus.CANCELLED && currentStatus === OrderStatus.PAID) {
    return OrderStatus.CANCELLED
  }

  if (nextPaymentStatus === PaymentStatus.REFUNDED && currentStatus === OrderStatus.PAID) {
    return OrderStatus.REFUNDED
  }

  if (
    nextPaymentStatus === PaymentStatus.REFUNDED &&
    (currentStatus === OrderStatus.SHIPPED || currentStatus === OrderStatus.DELIVERED)
  ) {
    return OrderStatus.REFUNDED
  }

  return currentStatus
}

export function canAdminCancelOrder(
  status: OrderStatus | OrderStatusValue,
  paymentStatus: PaymentStatus | PaymentStatusValue,
) {
  return !NON_CANCELLABLE_ORDER_STATUSES.has(status as OrderStatusValue) &&
    !FINALIZED_PAYMENT_STATUSES.has(paymentStatus as PaymentStatusValue)
}
