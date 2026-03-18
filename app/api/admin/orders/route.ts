import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAdminOrders, parseAdminOrdersQuery } from "@/lib/admin-orders"
import prisma from "@/lib/prisma"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function GET(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { page, status } = parseAdminOrdersQuery(new URL(req.url).searchParams)
    const orders = await getAdminOrders(prisma, { page, status })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Erro ao listar pedidos administrativos:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
