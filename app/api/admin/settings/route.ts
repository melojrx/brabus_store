import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { normalizeInstagramHandle } from "@/lib/store-settings"
import { isStaffRole } from "@/lib/auth-guard"

async function checkAdmin() {
  const session = await auth()
  return isStaffRole(session?.user?.role)
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const settings = await prisma.storeSettings.findFirst()
  return NextResponse.json(settings)
}

export async function PUT(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json()
    const normalizedBody = {
      ...body,
      instagram: normalizeInstagramHandle(typeof body.instagram === "string" ? body.instagram : ""),
      pixKey: typeof body.pixKey === "string" && body.pixKey.trim().length > 0 ? body.pixKey.trim() : null,
      mercadoPagoAccessToken: typeof body.mercadoPagoAccessToken === "string" && body.mercadoPagoAccessToken.trim().length > 0 ? body.mercadoPagoAccessToken.trim() : null,
      mercadoPagoEnvironment: ["sandbox", "production"].includes(body.mercadoPagoEnvironment) ? body.mercadoPagoEnvironment : "sandbox",
      expiryWarningDays: Number.isFinite(Number(body.expiryWarningDays)) && Number(body.expiryWarningDays) > 0
        ? Number(body.expiryWarningDays)
        : 30,
      expiryCriticalDays: Number.isFinite(Number(body.expiryCriticalDays)) && Number(body.expiryCriticalDays) > 0
        ? Number(body.expiryCriticalDays)
        : 7,
      expiryAlertsEnabled: body.expiryAlertsEnabled !== false,
      telegramBotToken: typeof body.telegramBotToken === "string" && body.telegramBotToken.trim().length > 0
        ? body.telegramBotToken.trim()
        : null,
      telegramChatId: typeof body.telegramChatId === "string" && body.telegramChatId.trim().length > 0
        ? body.telegramChatId.trim()
        : null,
    }
    const existing = await prisma.storeSettings.findFirst()
    const settings = existing
      ? await prisma.storeSettings.update({ where: { id: existing.id }, data: normalizedBody })
      : await prisma.storeSettings.create({ data: normalizedBody })
    return NextResponse.json(settings)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
