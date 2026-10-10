import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { logIntegrationAudit } from "@/lib/integrations/audit"
import { isAdminRole } from "@/lib/auth-guard"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.integrationApiKey.findUnique({
    where: { id },
    select: { id: true, active: true },
  })

  if (!existing) {
    return NextResponse.json({ error: "API key não encontrada." }, { status: 404 })
  }

  if (!existing.active) {
    return NextResponse.json({ error: "API key já está revogada." }, { status: 400 })
  }

  await prisma.integrationApiKey.update({
    where: { id },
    data: {
      active: false,
      revokedAt: new Date(),
    },
  })

  logIntegrationAudit({
    apiKeyId: id,
    actor: session.user?.email ?? "admin",
    action: "api_key.revoke",
    resourceType: "IntegrationApiKey",
    resourceId: id,
    result: "success",
  })

  return NextResponse.json({ ok: true })
}
