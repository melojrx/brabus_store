import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

const orderDetailSelect = {
  id: true,
  orderNumber: true,
  status: true,
  channel: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentInstallments: true,
  total: true,
  shippingType: true,
  shippingCarrier: true,
  shippingDeadline: true,
  shippingCost: true,
  trackingCode: true,
  customerNameSnapshot: true,
  customerEmailSnapshot: true,
  customerPhoneSnapshot: true,
  addressStreet: true,
  addressNumber: true,
  addressComplement: true,
  addressNeighborhood: true,
  addressCity: true,
  addressState: true,
  addressZip: true,
  createdAt: true,
  updatedAt: true,
  paidAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      productVariantId: true,
      productNameSnapshot: true,
      productSlugSnapshot: true,
      categoryNameSnapshot: true,
      subcategoryNameSnapshot: true,
      variantNameSnapshot: true,
      quantity: true,
      price: true,
      unitPrice: true,
      unitCost: true,
      selectedSize: true,
      selectedColor: true,
      selectedFlavor: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
} as const

export async function GET(
  req: Request,
  { params }: { params: Promise<{ idOrNumber: string }> },
) {
  try {
    await requireIntegrationScope(req, "read:orders")

    const { idOrNumber } = await params
    const decoded = decodeURIComponent(idOrNumber)

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: decoded },
          { orderNumber: decoded },
        ],
      },
      select: orderDetailSelect,
    })

    if (!order) {
      return integrationError("NOT_FOUND", "Pedido não encontrado.", 404)
    }

    const serialized = {
      ...order,
      total: order.total.toNumber(),
      shippingCost: order.shippingCost.toNumber(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      items: order.items.map((item) => ({
        ...item,
        price: item.price.toNumber(),
        unitPrice: item.unitPrice?.toNumber() ?? null,
        unitCost: item.unitCost?.toNumber() ?? null,
      })),
    }

    return integrationSuccess(serialized)
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
