import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { resetPasswordSchema } from "@/lib/account"
import { hashPasswordResetToken } from "@/lib/password-reset"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = resetPasswordSchema.parse(body)
    const tokenHash = hashPasswordResetToken(payload.token)

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
        userId: true,
      },
    })

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Este link de redefinição é inválido ou expirou." }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10)
    const now = new Date()

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
          id: { not: resetToken.id },
        },
        data: { usedAt: now },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível redefinir a senha." }, { status: 400 })
  }
}
