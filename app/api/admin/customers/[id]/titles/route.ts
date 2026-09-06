import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isStaffRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      creditBlocked: true,
      creditBlockedReason: true,
      receivables: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          order: { include: { items: true } },
          allocations: { include: { payment: true } },
        },
      },
      payments: {
        orderBy: { receivedAt: "desc" },
        include: { allocations: { include: { receivable: { include: { order: true } } } } },
      },
    },
  })

  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 })
  }

  const receivables = customer.receivables.map((title) => ({
    id: title.id,
    orderId: title.orderId,
    orderNumber: title.order.orderNumber,
    createdAt: title.createdAt.toISOString(),
    originalAmount: title.originalAmount.toNumber(),
    paidAmount: title.originalAmount.minus(title.openAmount).toNumber(),
    openAmount: title.openAmount.toNumber(),
    status: title.status,
    items: title.order.items.map((item) => ({
      quantity: item.quantity,
      productName: item.productNameSnapshot ?? "Produto",
      variantName: item.variantNameSnapshot,
    })),
  }))

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      creditBlocked: customer.creditBlocked,
      creditBlockedReason: customer.creditBlockedReason,
    },
    openBalance: receivables.reduce((sum, title) => sum + title.openAmount, 0),
    receivables,
    payments: customer.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toNumber(),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
      receivedAt: payment.receivedAt.toISOString(),
      reversedAt: payment.reversedAt?.toISOString() ?? null,
      reversalReason: payment.reversalReason,
      allocations: payment.allocations.map((allocation) => ({
        amount: allocation.amount.toNumber(),
        orderId: allocation.receivable.orderId,
        orderNumber: allocation.receivable.order.orderNumber,
      })),
    })),
  })
}
