import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { setCustomerCreditBlocked } from "@/lib/customer-credit"
import prisma from "@/lib/prisma"

const schema = z.object({ blocked: z.boolean(), reason: z.string().trim().max(1000).nullable().optional() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = schema.parse(await request.json())
    await setCustomerCreditBlocked(prisma, { ...body, customerId: id, actorUserId: session.user.id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payload inválido." }, { status: 400 })
  }
}
