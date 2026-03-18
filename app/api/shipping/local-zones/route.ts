import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const zones = await prisma.localDeliveryZone.findMany({
      where: { active: true },
      orderBy: { city: 'asc' }
    })
    return NextResponse.json(
      zones.map((zone) => ({
        ...zone,
        price: zone.price.toNumber(),
      })),
    )
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
