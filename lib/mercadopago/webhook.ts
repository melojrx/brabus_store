import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client"
import { createHmac, timingSafeEqual } from "node:crypto"
import { decrementOrderItemStock, incrementOrderItemStock } from "@/lib/order-stock"
import prisma from "@/lib/prisma"
import { dispatchOrderPaid } from "@/lib/webhooks/order-paid"
import type { MercadoPagoPayment, MercadoPagoPaymentStatus } from "./types"

type WebhookSignatureInput = {
  signature: string | null
  requestId: string | null
  dataId: string | null
  secret: string | null
}

type PaymentTransition = {
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus | null
  stockAction: "decrement" | "increment" | "none"
}

export function validateWebhookSignature({
  signature,
  requestId,
  dataId,
  secret,
}: WebhookSignatureInput): boolean {
  if (!signature || !requestId || !dataId || !secret) {
    return false
  }

  const values = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.trim().split("=", 2)
      return [key, value]
    }),
  )
  const timestamp = values.ts?.trim()
  const receivedSignature = values.v1?.trim()

  if (!timestamp || !receivedSignature) {
    return false
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`
  const expectedSignature = createHmac("sha256", secret).update(manifest).digest()
  const receivedBuffer = Buffer.from(receivedSignature, "hex")

  return receivedBuffer.length === expectedSignature.length && timingSafeEqual(receivedBuffer, expectedSignature)
}

export function getPaymentTransition(
  currentStatus: PaymentStatus,
  mercadoPagoStatus: MercadoPagoPaymentStatus,
): PaymentTransition {
  if (currentStatus === PaymentStatus.PENDING && mercadoPagoStatus === "approved") {
    return {
      paymentStatus: PaymentStatus.PAID,
      orderStatus: OrderStatus.PAID,
      stockAction: "decrement",
    }
  }

  if (currentStatus === PaymentStatus.PENDING && mercadoPagoStatus === "rejected") {
    return {
      paymentStatus: PaymentStatus.FAILED,
      orderStatus: OrderStatus.FAILED,
      stockAction: "none",
    }
  }

  if (currentStatus === PaymentStatus.PENDING && mercadoPagoStatus === "cancelled") {
    return {
      paymentStatus: PaymentStatus.CANCELLED,
      orderStatus: OrderStatus.CANCELLED,
      stockAction: "none",
    }
  }

  if (
    currentStatus === PaymentStatus.PAID &&
    (mercadoPagoStatus === "refunded" || mercadoPagoStatus === "charged_back")
  ) {
    return {
      paymentStatus: PaymentStatus.REFUNDED,
      orderStatus: OrderStatus.REFUNDED,
      stockAction: "increment",
    }
  }

  return {
    paymentStatus: currentStatus,
    orderStatus: null,
    stockAction: "none",
  }
}

function matchesOrderPaymentMethod(orderPaymentMethod: PaymentMethod, payment: MercadoPagoPayment) {
  if (orderPaymentMethod === PaymentMethod.MERCADO_PAGO_PIX) {
    return payment.payment_type_id === "pix" || payment.payment_method_id === "pix"
  }

  if (orderPaymentMethod === PaymentMethod.MERCADO_PAGO_CARD) {
    return payment.payment_type_id === "credit_card" || payment.payment_type_id === "debit_card"
  }

  return false
}

function hasExpectedPaymentData(order: {
  id: string
  total: { toNumber(): number }
  paymentMethod: PaymentMethod
}, payment: MercadoPagoPayment) {
  if (payment.external_reference !== order.id || payment.currency_id !== "BRL") {
    return false
  }

  if (!Number.isFinite(payment.transaction_amount)) {
    return false
  }

  return (
    Math.abs(payment.transaction_amount - order.total.toNumber()) < 0.001 &&
    matchesOrderPaymentMethod(order.paymentMethod, payment)
  )
}

export async function processWebhookPayment(
  paymentId: string,
  accessToken?: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getMercadoPagoClient } = await import("./client")
    const { payment: paymentClient } = getMercadoPagoClient(accessToken)
    const payment = (await paymentClient.get({ id: paymentId })) as unknown as MercadoPagoPayment

    if (!payment?.external_reference) {
      return { success: false, error: "Pagamento Mercado Pago sem referência do pedido." }
    }

    const order = await prisma.order.findUnique({
      where: { id: payment.external_reference },
      select: {
        id: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
      },
    })

    if (!order) {
      return { success: false, error: "Pedido não encontrado para o pagamento Mercado Pago." }
    }

    if (!hasExpectedPaymentData(order, payment)) {
      return { success: false, error: "Dados do pagamento Mercado Pago não correspondem ao pedido." }
    }

    const transition = getPaymentTransition(
      order.paymentStatus,
      payment.status as MercadoPagoPaymentStatus,
    )

    if (transition.stockAction === "decrement") {
      const claimedApproval = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: PaymentStatus.PENDING,
          },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PAID,
            paidAt: new Date(),
            mercadoPagoPaymentId: String(payment.id),
          },
        })

        if (updatedOrder.count !== 1) {
          return false
        }

        const items = await tx.orderItem.findMany({
          where: { orderId: order.id },
          select: {
            id: true,
            productId: true,
            productVariantId: true,
            quantity: true,
          },
        })
        await decrementOrderItemStock(tx, items)
        return true
      })

      if (claimedApproval) {
        dispatchOrderPaid(order.id).catch((error) => {
          console.error("Erro disparando webhook de pedido pago:", error)
        })
      }

      return { success: true }
    }

    if (transition.stockAction === "increment") {
      await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: PaymentStatus.PAID,
          },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
            status: OrderStatus.REFUNDED,
            mercadoPagoPaymentId: String(payment.id),
          },
        })

        if (updatedOrder.count !== 1) {
          return
        }

        const items = await tx.orderItem.findMany({
          where: { orderId: order.id },
          select: {
            id: true,
            productId: true,
            productVariantId: true,
            quantity: true,
          },
        })
        await incrementOrderItemStock(tx, items)
      })

      return { success: true }
    }

    if (transition.orderStatus) {
      await prisma.order.updateMany({
        where: {
          id: order.id,
          paymentStatus: PaymentStatus.PENDING,
        },
        data: {
          paymentStatus: transition.paymentStatus,
          status: transition.orderStatus,
          mercadoPagoPaymentId: String(payment.id),
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error("Erro processando webhook Mercado Pago:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao processar pagamento Mercado Pago.",
    }
  }
}
