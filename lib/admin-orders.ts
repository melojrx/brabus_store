import { OrderStatus, PaymentStatus, Prisma, PrismaClient } from "@prisma/client"
import { z } from "zod"
import {
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

const adminOrderListInclude = Prisma.validator<Prisma.OrderInclude>()({
  user: {
    select: {
      name: true,
      email: true,
      phone: true,
    },
  },
})

const adminOrderDetailInclude = Prisma.validator<Prisma.OrderInclude>()({
  user: {
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

function buildAdminOrdersWhere(status: AdminOrderStatusFilter): Prisma.OrderWhereInput {
  if (status === "ALL") {
    return {}
  }

  return {
    status,
  }
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
  const customerEmail =
    order.customerEmailSnapshot ??
    (order.user.email === PDV_WALK_IN_CUSTOMER_EMAIL ? "Não informado" : order.user.email)

  return {
    id: order.id,
    customerName: order.customerNameSnapshot ?? order.user.name,
    customerEmail,
    customerPhone: order.customerPhoneSnapshot ?? order.user.phone,
    createdAt: order.createdAt.toISOString(),
    total: decimalToNumber(order.total),
    status: order.status as OrderStatusValue,
    paymentMethod: order.paymentMethod as PaymentMethodValue,
    paymentStatus: order.paymentStatus as PaymentStatusValue,
    shippingType: order.shippingType,
    shippingCarrier: order.shippingCarrier,
    trackingCode: order.trackingCode,
  }
}

export async function getAdminOrders(
  prisma: AdminOrdersClient,
  options?: {
    page?: number
    pageSize?: number
    status?: AdminOrderStatusFilter
  },
) {
  const page = Math.max(1, options?.page ?? 1)
  const pageSize = normalizeOrdersPageSize(options?.pageSize)
  const status = options?.status ?? "ALL"
  const where = buildAdminOrdersWhere(status)

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
      status,
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
  return {
    page: normalizeOrdersPage(searchParams.get("page")),
    status: parseAdminOrderStatusFilter(searchParams.get("status")),
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
