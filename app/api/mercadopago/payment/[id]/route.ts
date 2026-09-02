import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getMercadoPagoClient } from "@/lib/mercadopago/client"
import { serializeMercadoPagoPaymentSummary } from "@/lib/mercadopago/checkout-pro"
import { getMercadoPagoSettings } from "@/lib/mercadopago/settings"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const orderId = new URL(req.url).searchParams.get("order_id")
    const order = await prisma.order.findFirst({
      where: {
        userId,
        OR: [
          { mercadoPagoPaymentId: id },
          ...(orderId ? [{ id: orderId }] : []),
        ],
      },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const mercadoPagoSettings = await getMercadoPagoSettings()

    if (!mercadoPagoSettings.accessToken) {
      return NextResponse.json({ error: "Mercado Pago not configured" }, { status: 503 })
    }

    const mp = getMercadoPagoClient(mercadoPagoSettings.accessToken)
    const payment = await mp.payment.get({ id })

    if (!payment || payment.id == null || payment.external_reference !== order.id) {
      if (payment) {
        return NextResponse.json({ error: "Payment reference mismatch" }, { status: 409 })
      }
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json(serializeMercadoPagoPaymentSummary(payment))
  } catch (error) {
    console.error("Erro consultando payment:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
