import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const zones = await prisma.localDeliveryZone.findMany({
      where: { active: true },
      orderBy: { city: 'asc' }
    })
    return NextResponse.json(zones)
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
