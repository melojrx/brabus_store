import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getStripeServerClient } from "@/lib/stripe"
import { getPublicStoreSettings } from "@/lib/store-settings"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const stripe = getStripeServerClient()
    const [session, order, storeSettings] = await Promise.all([
      stripe.checkout.sessions.retrieve(id),
      prisma.order.findFirst({
        where: { stripeSessionId: id },
        select: {
          id: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          total: true,
          shippingType: true,
        },
      }),
      getPublicStoreSettings(),
    ])

    return NextResponse.json({
      source: "stripe",
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      whatsapp: storeSettings.whatsapp,
      order: order
        ? {
            id: order.id,
            status: order.status,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            total: order.total.toNumber(),
            shippingType: order.shippingType,
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível consultar a sessão do checkout." }, { status: 400 })
  }
}
