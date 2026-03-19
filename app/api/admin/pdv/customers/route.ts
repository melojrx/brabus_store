import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { PDV_WALK_IN_CUSTOMER_EMAIL } from "@/lib/pdv"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function GET(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")?.trim() ?? ""

  const customers = await prisma.user.findMany({
    where: {
      role: Role.CUSTOMER,
      email: {
        not: PDV_WALK_IN_CUSTOMER_EMAIL,
      },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      addressStreet: true,
      addressNumber: true,
      addressComplement: true,
      addressNeighborhood: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
    },
  })

  return NextResponse.json(customers)
}
