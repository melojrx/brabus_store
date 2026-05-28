import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isStaffRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 20))

  const [totalItems, deliveries] = await Promise.all([
    prisma.webhookDelivery.count({ where: { endpointId: id } }),
    prisma.webhookDelivery.findMany({
      where: { endpointId: id },
      select: {
        id: true,
        event: true,
        httpStatus: true,
        success: true,
        attempts: true,
        lastAttemptAt: true,
        nextRetryAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    data: deliveries,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  })
}
