import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { auth } from "@/auth"
import { isAdminRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"

function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12)
}

export async function POST(
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
  const existing = await prisma.user.findUnique({ where: { id } })

  if (!existing || existing.role === "CUSTOMER") {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  }

  const temporaryPassword = generateTemporaryPassword()
  const hashedPassword = await hash(temporaryPassword, 10)

  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      mustChangePassword: true,
    },
  })

  return NextResponse.json({ ok: true, temporaryPassword })
}
