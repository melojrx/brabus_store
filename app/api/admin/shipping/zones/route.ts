import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const zones = await prisma.localDeliveryZone.findMany({ orderBy: { city: "asc" } })
  return NextResponse.json(zones)
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { city, state, price, deadlineText, active } = await req.json()
    const zone = await prisma.localDeliveryZone.create({
      data: { city, state: state || "CE", price: parseFloat(price), deadlineText, active: active ?? true },
    })
    return NextResponse.json(zone, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
