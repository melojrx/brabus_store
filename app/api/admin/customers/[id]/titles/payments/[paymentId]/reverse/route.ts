import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { reverseCustomerPayment } from "@/lib/customer-credit"
import prisma from "@/lib/prisma"

const schema = z.object({ reason: z.string().trim().min(3).max(1000) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const session = await auth()
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id, paymentId } = await params
    const { reason } = schema.parse(await request.json())
    await reverseCustomerPayment(prisma, { customerId: id, paymentId, actorUserId: session.user.id, reason })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payload inválido." }, { status: 400 })
  }
}
