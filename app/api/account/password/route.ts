import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { changePasswordSchema } from "@/lib/account"

export async function PUT(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const payload = changePasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    const currentPasswordMatches = await bcrypt.compare(payload.currentPassword, user.password)

    if (!currentPasswordMatches) {
      return NextResponse.json({ error: "A senha atual está incorreta." }, { status: 400 })
    }

    const nextPasswordMatchesCurrent = await bcrypt.compare(payload.newPassword, user.password)

    if (nextPasswordMatchesCurrent) {
      return NextResponse.json({ error: "A nova senha deve ser diferente da atual." }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(payload.newPassword, 10)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    await prisma.passwordResetToken.updateMany({
      where: {
        userId: session.user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível atualizar a senha." }, { status: 400 })
  }
}
