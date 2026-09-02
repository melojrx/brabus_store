import { NextResponse } from "next/server"
import { validateWebhookSignature, processWebhookPayment } from "@/lib/mercadopago/webhook"
import { getMercadoPagoWebhookSecret } from "@/lib/mercadopago/env"
import { getMercadoPagoSettings } from "@/lib/mercadopago/settings"

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-signature")
    const requestId = req.headers.get("x-request-id")

    const body = await req.json()
    const topic = body.type ?? body.topic
    const paymentId = body.data?.id

    if (!topic) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    if (topic !== "payment") {
      return NextResponse.json({ status: "ignored" })
    }

    const webhookSecret = getMercadoPagoWebhookSecret()
    if (!webhookSecret) {
      return NextResponse.json({ error: "Mercado Pago webhook not configured" }, { status: 503 })
    }

    const isValidSignature = validateWebhookSignature({
      signature,
      requestId,
      dataId: typeof paymentId === "string" || typeof paymentId === "number" ? String(paymentId) : null,
      secret: webhookSecret,
    })

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const mercadoPagoSettings = await getMercadoPagoSettings()
    if (!mercadoPagoSettings.accessToken) {
      return NextResponse.json({ error: "Mercado Pago not configured" }, { status: 503 })
    }

    const result = await processWebhookPayment(String(paymentId), mercadoPagoSettings.accessToken)

    if (!result.success) {
      console.error("Webhook payment error:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
