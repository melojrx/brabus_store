import { NextResponse } from "next/server"
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client"
import { auth } from "@/auth"
import { canAdminCancelOrder } from "@/lib/admin-orders"
import { incrementOrderItemStock } from "@/lib/order-stock"
import prisma from "@/lib/prisma"
import { isStaffRole } from "@/lib/auth-guard"

async function checkAdmin() {
  const session = await auth()
  return isStaffRole(session?.user?.role)
}

function isOnlinePaymentMethod(paymentMethod: PaymentMethod) {
  return paymentMethod === PaymentMethod.MERCADO_PAGO_CARD || paymentMethod === PaymentMethod.MERCADO_PAGO_PIX
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!isStaffRole(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        paidAt: true,
        receivable: { include: { allocations: { include: { payment: { select: { reversedAt: true } } } } } },
        items: {
          select: {
            id: true,
            productId: true,
            productVariantId: true,
            quantity: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
    }

    const hasActiveFiadoReceipt = order.paymentMethod === PaymentMethod.FIADO &&
      order.receivable?.allocations.some((allocation) => !allocation.payment.reversedAt)
    if (hasActiveFiadoReceipt) {
      return NextResponse.json(
        { error: "Estorne os recebimentos deste título antes de cancelar a venda fiado." },
        { status: 400 },
      )
    }

    if (order.paymentMethod !== PaymentMethod.FIADO && !canAdminCancelOrder(order.status, order.paymentStatus)) {
      return NextResponse.json(
        { error: "Este pedido não pode mais ser cancelado pelo atalho da listagem." },
        { status: 400 },
      )
    }

    const isOnlineOrder = isOnlinePaymentMethod(order.paymentMethod)
    const isPaidOrder = order.paymentStatus === PaymentStatus.PAID

    // Note: Online payment refunds are handled via MercadoPago webhooks
    // Admin cancel flow only handles order status update and stock

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          paidAt: true,
          receivable: { include: { allocations: { include: { payment: { select: { reversedAt: true } } } } } },
          items: {
            select: {
              id: true,
              productId: true,
              productVariantId: true,
              quantity: true,
            },
          },
        },
      })

      if (!currentOrder) {
        throw new Error("Pedido não encontrado durante o cancelamento.")
      }

      const currentHasActiveFiadoReceipt = currentOrder.paymentMethod === PaymentMethod.FIADO &&
        currentOrder.receivable?.allocations.some((allocation) => !allocation.payment.reversedAt)
      if (currentHasActiveFiadoReceipt) {
        throw new Error("Estorne os recebimentos deste título antes de cancelar a venda fiado.")
      }

      if (currentOrder.paymentMethod !== PaymentMethod.FIADO && !canAdminCancelOrder(currentOrder.status, currentOrder.paymentStatus)) {
        return tx.order.findUniqueOrThrow({
          where: { id },
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            updatedAt: true,
          },
        })
      }

      const isFiadoOrder = currentOrder.paymentMethod === PaymentMethod.FIADO
      const shouldReturnStock = currentOrder.paymentStatus === PaymentStatus.PAID || isFiadoOrder
      const currentIsOnlineOrder = isOnlinePaymentMethod(currentOrder.paymentMethod)
      const nextPaymentStatus = isFiadoOrder
        ? PaymentStatus.CANCELLED
        :
        currentIsOnlineOrder && shouldReturnStock ? PaymentStatus.REFUNDED : PaymentStatus.CANCELLED
      const nextStatus =
        nextPaymentStatus === PaymentStatus.REFUNDED ? OrderStatus.REFUNDED : OrderStatus.CANCELLED

      if (shouldReturnStock) {
        await incrementOrderItemStock(tx, currentOrder.items)
      }

      if (isFiadoOrder && currentOrder.receivable) {
        await tx.customerReceivable.update({
          where: { id: currentOrder.receivable.id },
          data: { status: "CANCELLED", openAmount: 0, cancelledAt: new Date() },
        })
        await tx.customerCreditEvent.create({
          data: {
            customerId: currentOrder.receivable.customerId,
            actorUserId: session!.user!.id,
            type: "RECEIVABLE_CANCELLED",
            amount: currentOrder.receivable.originalAmount,
            orderId: currentOrder.id,
            receivableId: currentOrder.receivable.id,
          },
        })
      }

      return tx.order.update({
        where: { id },
        data: {
          status: nextStatus,
          paymentStatus: nextPaymentStatus,
          paidAt: nextPaymentStatus === PaymentStatus.CANCELLED ? null : currentOrder.paidAt,
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          updatedAt: true,
        },
      })
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Erro ao cancelar pedido no admin:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
