import { NextResponse } from "next/server"
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client"
import Stripe from "stripe"
import { auth } from "@/auth"
import { canAdminCancelOrder } from "@/lib/admin-orders"
import { incrementOrderItemStock } from "@/lib/order-stock"
import prisma from "@/lib/prisma"
import { getStripeServerClient } from "@/lib/stripe"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

function isStripePaymentMethod(paymentMethod: PaymentMethod) {
  return paymentMethod === PaymentMethod.STRIPE_CARD || paymentMethod === PaymentMethod.STRIPE_PIX
}

async function expireStripeCheckoutSession(sessionId: string) {
  try {
    const stripe = getStripeServerClient()
    await stripe.checkout.sessions.expire(sessionId)
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      typeof error.message === "string" &&
      (error.message.includes("already expired") || error.message.includes("is not in an expireable state"))
    ) {
      return
    }

    throw error
  }
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) {
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
        stripeSessionId: true,
        stripePaymentId: true,
        paidAt: true,
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

    if (!canAdminCancelOrder(order.status, order.paymentStatus)) {
      return NextResponse.json(
        { error: "Este pedido não pode mais ser cancelado pelo atalho da listagem." },
        { status: 400 },
      )
    }

    const isStripeOrder = isStripePaymentMethod(order.paymentMethod)
    const isPaidOrder = order.paymentStatus === PaymentStatus.PAID

    if (isStripeOrder && isPaidOrder && order.stripePaymentId) {
      const stripe = getStripeServerClient()
      await stripe.refunds.create({
        payment_intent: order.stripePaymentId,
        reason: "requested_by_customer",
      })
    }

    if (isStripeOrder && !isPaidOrder && order.stripeSessionId) {
      await expireStripeCheckoutSession(order.stripeSessionId)
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          paidAt: true,
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

      if (!canAdminCancelOrder(currentOrder.status, currentOrder.paymentStatus)) {
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

      const shouldReturnStock = currentOrder.paymentStatus === PaymentStatus.PAID
      const currentIsStripeOrder = isStripePaymentMethod(currentOrder.paymentMethod)
      const nextPaymentStatus =
        currentIsStripeOrder && shouldReturnStock ? PaymentStatus.REFUNDED : PaymentStatus.CANCELLED
      const nextStatus =
        nextPaymentStatus === PaymentStatus.REFUNDED ? OrderStatus.REFUNDED : OrderStatus.CANCELLED

      if (shouldReturnStock) {
        await incrementOrderItemStock(tx, currentOrder.items)
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
