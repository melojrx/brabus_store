import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { generateApiKey, hashApiKey } from "@/lib/integrations/auth"
import { logIntegrationAudit } from "@/lib/integrations/audit"
import { isAdminRole } from "@/lib/auth-guard"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const keys = await prisma.integrationApiKey.findMany({
    select: {
      id: true,
      name: true,
      actor: true,
      scopes: true,
      active: true,
      lastUsedAt: true,
      createdAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(keys)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const actor = typeof body.actor === "string" ? body.actor.trim() : ""
    const scopes = Array.isArray(body.scopes)
      ? body.scopes.filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
      : []

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
    }

    if (!actor) {
      return NextResponse.json({ error: "Actor é obrigatório." }, { status: 400 })
    }

    if (scopes.length === 0) {
      return NextResponse.json({ error: "Selecione ao menos um scope." }, { status: 400 })
    }

    const plainTextKey = generateApiKey()
    const keyHash = hashApiKey(plainTextKey)

    const apiKey = await prisma.integrationApiKey.create({
      data: {
        name,
        actor,
        keyHash,
        scopes,
      },
      select: {
        id: true,
        name: true,
        actor: true,
        scopes: true,
        active: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
    })

    logIntegrationAudit({
      apiKeyId: apiKey.id,
      actor: session.user?.email ?? "admin",
      action: "api_key.create",
      resourceType: "IntegrationApiKey",
      resourceId: apiKey.id,
      result: "success",
    })

    return NextResponse.json(
      {
        ok: true,
        data: {
          apiKey,
          plainTextKey,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating API key:", error)
    return NextResponse.json({ error: "Erro interno ao criar API key." }, { status: 500 })
  }
}
