import { ZodError } from "zod"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateOrderStatusSchema } from "@/lib/admin-orders"
import prisma from "@/lib/prisma"

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
    const { status } = updateOrderStatusSchema.parse(body)

    if (status === "CANCELLED" || status === "REFUNDED") {
      return NextResponse.json(
        { error: "Use a ação de cancelamento ou o controle de pagamento para cancelar/reembolsar o pedido." },
        { status: 400 },
      )
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
        trackingCode: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Status inválido." }, { status: 400 })
    }

    console.error("Erro ao atualizar status do pedido:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
