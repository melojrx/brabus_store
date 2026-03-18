import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { id } = await params
    const { city, state, price, deadlineText, active } = await req.json()
    const zone = await prisma.localDeliveryZone.update({
      where: { id },
      data: { city, state, price: parseFloat(price), deadlineText, active },
    })
    return NextResponse.json(zone)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { id } = await params
    await prisma.localDeliveryZone.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
