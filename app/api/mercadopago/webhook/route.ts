import { NextResponse } from "next/server"
import { validateWebhookSignature, processWebhookPayment } from "@/lib/mercadopago/webhook"
import { getMercadoPagoSettings } from "@/lib/mercadopago/settings"

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-signature")
    const signatureDate = req.headers.get("x-signature-date")
    const apiVersion = req.headers.get("x-api-version") ?? "v1"

    const body = await req.json()

    const { topic, id, action, data } = body

    if (!topic || !id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const mercadoPagoSettings = await getMercadoPagoSettings()

    // Validar assinatura para merchant_order (obrigatório)
    if (topic === "merchant_order") {
      if (!signature || !signatureDate) {
        return NextResponse.json({ error: "Missing signature headers" }, { status: 401 })
      }

      if (!mercadoPagoSettings.accessToken) {
        return NextResponse.json({ error: "Mercado Pago not configured" }, { status: 503 })
      }

      const isValid = validateWebhookSignature(
        topic,
        apiVersion,
        id,
        signature,
        signatureDate,
        mercadoPagoSettings.accessToken,
      )

      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    if (topic === "payment") {
      const paymentId = data?.id ?? id
      const result = await processWebhookPayment(paymentId, mercadoPagoSettings.accessToken)

      if (!result.success) {
        console.error("Webhook payment error:", result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
