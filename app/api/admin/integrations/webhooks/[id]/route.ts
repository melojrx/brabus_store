import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isStaffRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
      secret: true,
      events: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint não encontrado." }, { status: 404 })
  }

  return NextResponse.json(endpoint)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim()
  }

  if (typeof body.url === "string" && body.url.trim().startsWith("http")) {
    data.url = body.url.trim()
  }

  if (Array.isArray(body.events)) {
    const valid = body.events.filter(
      (e: unknown) => typeof e === "string" && WEBHOOK_EVENTS.includes(e as any),
    )
    if (valid.length > 0) data.events = valid
  }

  if (typeof body.active === "boolean") {
    data.active = body.active
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 })
  }

  try {
    const updated = await prisma.webhookEndpoint.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        active: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Endpoint não encontrado." }, { status: 404 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.webhookEndpoint.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Endpoint não encontrado." }, { status: 404 })
  }
}
