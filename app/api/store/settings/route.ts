import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.storeSettings.findFirst()
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
