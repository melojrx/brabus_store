import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isStaffRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"
import { sendWebhook } from "@/lib/webhooks/sender"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; deliveryId: string }> },
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, deliveryId } = await params

  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, endpointId: id },
    include: {
      endpoint: { select: { url: true, secret: true, active: true } },
    },
  })

  if (!delivery) {
    return NextResponse.json({ error: "Delivery não encontrada." }, { status: 404 })
  }

  if (!delivery.endpoint.active) {
    return NextResponse.json({ error: "Endpoint está inativo." }, { status: 400 })
  }

  const success = await sendWebhook({
    deliveryId: delivery.id,
    url: delivery.endpoint.url,
    secret: delivery.endpoint.secret,
    payload: delivery.payload,
    event: delivery.event,
  })

  return NextResponse.json({ ok: true, success })
}
