import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { DASHBOARD_ORDERS_PAGE_SIZE, getAdminDashboardData } from "@/lib/admin-dashboard"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10)
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1

    const dashboard = await getAdminDashboardData(prisma, page, DASHBOARD_ORDERS_PAGE_SIZE)

    return NextResponse.json(dashboard)
  } catch (error) {
    console.error("Erro ao carregar dashboard admin:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
