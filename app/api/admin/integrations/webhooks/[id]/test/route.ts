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

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
    select: { id: true, url: true, secret: true },
  })

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint não encontrado." }, { status: 404 })
  }

  const testPayload = {
    id: "evt_test_ping",
    event: "ping",
    createdAt: new Date().toISOString(),
    data: { message: "Webhook endpoint test from Brabus Store." },
  }

  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId: endpoint.id,
      event: "ping",
      payload: testPayload,
    },
  })

  const success = await sendWebhook({
    deliveryId: delivery.id,
    url: endpoint.url,
    secret: endpoint.secret,
    payload: testPayload,
    event: "ping",
  })

  return NextResponse.json({ ok: true, success, deliveryId: delivery.id })
}
