import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getMercadoPagoClient } from "@/lib/mercadopago/client"
import { getMercadoPagoSettings } from "@/lib/mercadopago/settings"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const mercadoPagoSettings = await getMercadoPagoSettings()

    if (!mercadoPagoSettings.accessToken) {
      return NextResponse.json({ error: "Mercado Pago not configured" }, { status: 503 })
    }

    const mp = getMercadoPagoClient(mercadoPagoSettings.accessToken)
    const payment = await mp.payment.get({ id })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Erro consultando payment:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
