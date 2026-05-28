import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { auth } from "@/auth"
import { isStaffRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const endpoints = await prisma.webhookEndpoint.findMany({
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(endpoints)
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const url = typeof body.url === "string" ? body.url.trim() : ""
    const events: string[] = Array.isArray(body.events)
      ? body.events.filter((e: unknown) => typeof e === "string" && WEBHOOK_EVENTS.includes(e as any))
      : []

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
    }

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "URL inválida." }, { status: 400 })
    }

    if (events.length === 0) {
      return NextResponse.json({ error: "Selecione ao menos um evento." }, { status: 400 })
    }

    const secret = `whk_${randomBytes(32).toString("hex")}`

    const endpoint = await prisma.webhookEndpoint.create({
      data: { name, url, secret, events },
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        events: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ ok: true, data: endpoint }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar webhook endpoint:", error)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
