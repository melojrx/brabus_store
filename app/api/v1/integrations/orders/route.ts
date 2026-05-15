import { OrderChannel, OrderStatus, PaymentStatus } from "@prisma/client"
import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 20

function parsePageParam(value: string | null, defaultValue: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue
  return Math.min(parsed, max)
}

export async function GET(req: Request) {
  try {
    await requireIntegrationScope(req, "read:orders")

    const { searchParams } = new URL(req.url)
    const page = parsePageParam(searchParams.get("page"), 1, 1000)
    const pageSize = parsePageParam(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const status = searchParams.get("status")
    const paymentStatus = searchParams.get("paymentStatus")
    const channel = searchParams.get("channel")

    const where: Record<string, unknown> = {}

    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.status = status
    }

    if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      where.paymentStatus = paymentStatus
    }

    if (channel && Object.values(OrderChannel).includes(channel as OrderChannel)) {
      where.channel = channel
    }

    const [totalItems, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          channel: true,
          paymentMethod: true,
          paymentStatus: true,
          total: true,
          shippingType: true,
          shippingCarrier: true,
          shippingDeadline: true,
          shippingCost: true,
          trackingCode: true,
          customerNameSnapshot: true,
          customerEmailSnapshot: true,
          customerPhoneSnapshot: true,
          createdAt: true,
          paidAt: true,
          items: {
            select: {
              id: true,
              productId: true,
              productNameSnapshot: true,
              variantNameSnapshot: true,
              quantity: true,
              price: true,
              selectedSize: true,
              selectedColor: true,
              selectedFlavor: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const serialized = orders.map((order) => ({
      ...order,
      total: order.total.toNumber(),
      shippingCost: order.shippingCost.toNumber(),
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      items: order.items.map((item) => ({
        ...item,
        price: item.price.toNumber(),
      })),
    }))

    return integrationSuccess(serialized, {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
