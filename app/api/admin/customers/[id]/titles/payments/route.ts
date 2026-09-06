import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { isStaffRole } from "@/lib/auth-guard"
import { registerCustomerPayment } from "@/lib/customer-credit"
import prisma from "@/lib/prisma"

const paymentSchema = z.object({
  amount: z.coerce.number().positive().finite(),
  paymentMethod: z.enum(["CASH", "MANUAL_PIX", "POS_DEBIT", "POS_CREDIT"]),
  reference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  idempotencyKey: z.string().uuid(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = paymentSchema.parse(await request.json())
    const result = await registerCustomerPayment(prisma, { ...body, customerId: id, actorUserId: session.user.id })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payload inválido." }, { status: 400 })
  }
}
