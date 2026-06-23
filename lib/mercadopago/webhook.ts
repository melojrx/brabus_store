import { PaymentStatus } from "@prisma/client"
import prisma from "@/lib/prisma"
import type { MercadoPagoPaymentStatus } from "./types"
import crypto from "crypto"

const STATUS_MAP: Record<MercadoPagoPaymentStatus, PaymentStatus> = {
  pending: "PENDING",
  approved: "PAID",
  rejected: "FAILED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
  in_process: "PENDING",
  in_mediation: "PENDING",
  charged_back: "REFUNDED",
  partial_refunded: "PARTIAL_REFUNDED",
}

export function validateWebhookSignature(
  topic: string,
  apiVersion: string,
  id: string,
  sentSignature: string,
  sentDate: string,
  accessToken: string,
): boolean {
  if (!sentSignature || !sentDate) {
    return false
  }

  const message = `${topic}|${apiVersion}|${id}|${sentDate}`
  const expectedSignature = crypto
    .createHmac("sha256", accessToken)
    .update(message)
    .digest("hex")

  const sentBuffer = Buffer.from(sentSignature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (sentBuffer.length !== expectedBuffer.length) {
    return false
  }
  return crypto.timingSafeEqual(sentBuffer, expectedBuffer)
}

export async function processWebhookPayment(
  paymentId: string,
  accessToken?: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getMercadoPagoClient } = await import("./client")
    const mp = getMercadoPagoClient(accessToken)

    const payment = await mp.payment.get({ id: paymentId })

    if (!payment || !payment.external_reference) {
      return { success: false, error: "Payment not found" }
    }

    const orderId = payment.external_reference
    const mpStatus = payment.status as MercadoPagoPaymentStatus
    const newPaymentStatus = STATUS_MAP[mpStatus]

    if (!newPaymentStatus) {
      return { success: false, error: `Unknown payment status: ${mpStatus}` }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: newPaymentStatus,
        mercadoPagoPaymentId: paymentId,
        paidAt: mpStatus === "approved" ? new Date() : undefined,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Erro processando webhook:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
