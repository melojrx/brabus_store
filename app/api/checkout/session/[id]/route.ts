import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getStripeServerClient } from "@/lib/stripe"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const stripe = getStripeServerClient()
    const session = await stripe.checkout.sessions.retrieve(id)

    const order = await prisma.order.findFirst({
      where: { stripeSessionId: id },
      select: {
        id: true,
        status: true,
        total: true,
        shippingType: true,
      },
    })

    return NextResponse.json({
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      order: order
        ? {
            id: order.id,
            status: order.status,
            total: order.total.toNumber(),
            shippingType: order.shippingType,
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível consultar a sessão do checkout." }, { status: 400 })
  }
}
