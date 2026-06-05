import { NextResponse } from "next/server"
import { validateWebhookSignature, processWebhookPayment } from "@/lib/mercadopago/webhook"

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

    // Validar assinatura para merchant_order (obrigatório)
    if (topic === "merchant_order") {
      if (!signature || !signatureDate) {
        return NextResponse.json({ error: "Missing signature headers" }, { status: 401 })
      }
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? ""
      const isValid = validateWebhookSignature(topic, apiVersion, id, signature, signatureDate, accessToken)

      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    if (topic === "payment") {
      const paymentId = data?.id ?? id
      const result = await processWebhookPayment(paymentId)

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