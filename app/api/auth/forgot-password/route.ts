import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { forgotPasswordSchema } from "@/lib/account"
import { buildPasswordResetUrl, createPasswordResetTokenPair } from "@/lib/password-reset"

const genericSuccessResponse = {
  success: true,
  message: "Se existir uma conta com este e-mail, enviaremos as instruções para redefinir a senha.",
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = forgotPasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json(genericSuccessResponse)
    }

    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    })

    const tokenPair = createPasswordResetTokenPair()

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: tokenPair.tokenHash,
        expiresAt: tokenPair.expiresAt,
        userId: user.id,
      },
    })

    const resetUrl = buildPasswordResetUrl(request.url, tokenPair.rawToken)
    console.info(`[auth] Password reset requested for ${user.email}: ${resetUrl}`)

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        ...genericSuccessResponse,
        resetUrl,
      })
    }

    return NextResponse.json(genericSuccessResponse)
  } catch (error) {
    return NextResponse.json(genericSuccessResponse)
  }
}
