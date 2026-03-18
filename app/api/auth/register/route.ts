import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { normalizePhone } from "@/lib/account"

const registerSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Informe um telefone com DDD"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, phone, password } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: normalizePhone(phone),
        password: hashedPassword,
      },
    })

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}
