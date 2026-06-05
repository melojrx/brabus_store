import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getMercadoPagoClient } from "@/lib/mercadopago/client"

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
    const mp = getMercadoPagoClient()
    const payment = await mp.payment.get(id)

    if (!payment || !payment.body) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json(payment.body)
  } catch (error) {
    console.error("Erro consultando payment:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
