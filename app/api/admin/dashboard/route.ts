import { NextResponse } from "next/server"
import { PrismaClient, OrderStatus } from "@prisma/client"
import { auth } from "@/auth"

const prisma = new PrismaClient()

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const totalOrders = await prisma.order.count()
    
    // Calcula receita APENAS de pedidos com status PAID, SHIPPED, DELIVERED
    const paidStatuses = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
    const revenueAgg = await prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { in: paidStatuses } }
    })
    const revenue = revenueAgg._sum.total || 0

    const pendingOrders = await prisma.order.count({ where: { status: OrderStatus.PENDING } })
    const totalCustomers = await prisma.user.count({ where: { role: 'CUSTOMER' } })
    const lowStockProducts = await prisma.product.count({ where: { stock: { lt: 10 } } })
    
    const latestOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    })

    return NextResponse.json({
      metrics: {
        revenue,
        totalOrders,
        pendingOrders,
        totalCustomers,
        lowStockProducts
      },
      latestOrders
    })
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
