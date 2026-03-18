import { ZodError } from "zod"
import { NextResponse } from "next/server"
import { PaymentMethod, PaymentStatus } from "@prisma/client"
import { auth } from "@/auth"
import {
  getNextOperationalStatusForPayment,
  updateOrderPaymentSchema,
} from "@/lib/admin-orders"
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
    const payload = updateOrderPaymentSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        total: true,
        status: true,
        paymentStatus: true,
        paidAt: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
    }

    const orderTotal = order.total.toNumber()
    const cashReceivedAmount =
      payload.paymentMethod === PaymentMethod.CASH ? payload.cashReceivedAmount : null
    const computedChangeAmount =
      payload.paymentMethod === PaymentMethod.CASH && cashReceivedAmount != null
        ? Number((cashReceivedAmount - orderTotal).toFixed(2))
        : null
    const changeAmount =
      payload.paymentMethod === PaymentMethod.CASH
        ? payload.changeAmount ?? (computedChangeAmount != null && computedChangeAmount > 0 ? computedChangeAmount : 0)
        : null

    if (
      payload.paymentMethod === PaymentMethod.CASH &&
      payload.paymentStatus === PaymentStatus.PAID &&
      cashReceivedAmount != null &&
      cashReceivedAmount < orderTotal
    ) {
      return NextResponse.json(
        { error: "O valor recebido em dinheiro não pode ser menor que o total do pedido." },
        { status: 400 },
      )
    }

    const nextOperationalStatus = getNextOperationalStatusForPayment(order.status, payload.paymentStatus)
    const paidAt =
      payload.paymentStatus === PaymentStatus.PAID
        ? order.paidAt ?? new Date()
        : payload.paymentStatus === PaymentStatus.PENDING || payload.paymentStatus === PaymentStatus.CANCELLED || payload.paymentStatus === PaymentStatus.FAILED
          ? null
          : order.paidAt

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: nextOperationalStatus,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus,
        paidAt,
        manualPaymentReference:
          payload.paymentMethod === PaymentMethod.MANUAL_PIX ? payload.manualPaymentReference : null,
        manualPaymentNotes:
          payload.paymentMethod === PaymentMethod.CASH || payload.paymentMethod === PaymentMethod.MANUAL_PIX
            ? payload.manualPaymentNotes
            : null,
        cashReceivedAmount,
        changeAmount,
      },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        paidAt: true,
        manualPaymentReference: true,
        manualPaymentNotes: true,
        cashReceivedAmount: true,
        changeAmount: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      ...updatedOrder,
      cashReceivedAmount: updatedOrder.cashReceivedAmount?.toNumber() ?? null,
      changeAmount: updatedOrder.changeAmount?.toNumber() ?? null,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Payload inválido." }, { status: 400 })
    }

    console.error("Erro ao atualizar pagamento do pedido:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
