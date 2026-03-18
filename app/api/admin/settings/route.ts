import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const settings = await prisma.storeSettings.findFirst()
  return NextResponse.json(settings)
}

export async function PUT(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json()
    const existing = await prisma.storeSettings.findFirst()
    const settings = existing
      ? await prisma.storeSettings.update({ where: { id: existing.id }, data: body })
      : await prisma.storeSettings.create({ data: body })
    return NextResponse.json(settings)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
