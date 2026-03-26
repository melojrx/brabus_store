import { NextResponse } from "next/server"
import { OrderChannel, PaymentStatus } from "@prisma/client"
import { ZodError } from "zod"
import { auth } from "@/auth"
import { createManualOrder } from "@/lib/manual-orders"
import prisma from "@/lib/prisma"
import {
  createPdvOrderSchema,
  ensurePdvWalkInCustomer,
} from "@/lib/pdv"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const payload = createPdvOrderSchema.parse(body)

    const [selectedCustomer, walkInCustomer] = await Promise.all([
      payload.customerId
        ? prisma.user.findUnique({
            where: { id: payload.customerId },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          })
        : Promise.resolve(null),
      payload.customerId ? Promise.resolve(null) : ensurePdvWalkInCustomer(prisma),
    ])

    if (payload.customerId && (!selectedCustomer || selectedCustomer.role !== "CUSTOMER")) {
      return NextResponse.json({ error: "Cliente inválido para a venda presencial." }, { status: 400 })
    }

    const customerId = selectedCustomer?.id ?? walkInCustomer?.id

    if (!customerId) {
      return NextResponse.json({ error: "Não foi possível resolver o cliente do pedido." }, { status: 500 })
    }

    const customerNameSnapshot = payload.customerId
      ? selectedCustomer?.name ?? null
      : payload.customerName
    const customerEmailSnapshot = payload.customerId
      ? selectedCustomer?.email ?? null
      : payload.customerEmail
    const customerPhoneSnapshot = payload.customerId
      ? selectedCustomer?.phone ?? null
      : payload.customerPhone

    const createdOrder = await createManualOrder(prisma, {
      userId: customerId,
      channel: OrderChannel.PDV,
      customerNameSnapshot,
      customerEmailSnapshot,
      customerPhoneSnapshot,
      items: payload.items,
      shippingType: payload.shippingType,
      shippingServiceId: payload.shippingServiceId,
      address: payload.address,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentStatus === "PAID" ? PaymentStatus.PAID : PaymentStatus.PENDING,
      paymentInstallments: payload.paymentInstallments,
      manualPaymentReference: payload.manualPaymentReference,
      manualPaymentNotes: payload.manualPaymentNotes,
      cashReceivedAmount: payload.cashReceivedAmount,
    })

    return NextResponse.json(createdOrder, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Erro de validação no PDV:", error.issues)
      return NextResponse.json({ error: error.issues[0]?.message ?? "Payload inválido." }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error("Erro ao criar pedido no PDV:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
