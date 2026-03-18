import { z } from "zod"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

const toggleProductSchema = z.object({
  active: z.boolean(),
})

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { active } = toggleProductSchema.parse(body)

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        active: true,
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Payload inválido." }, { status: 400 })
    }

    console.error("Erro ao alternar status do produto:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
