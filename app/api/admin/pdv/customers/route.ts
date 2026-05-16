import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { isStaffRole } from "@/lib/auth-guard"

async function checkAdmin() {
  const session = await auth()
  return isStaffRole(session?.user?.role)
}

export async function GET(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")?.trim() ?? ""

  const customers = await prisma.customer.findMany({
    where: {
      active: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { cpf: { contains: query.replace(/\D/g, "") } },
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
      userId: true,
      addressStreet: true,
      addressNumber: true,
      addressComplement: true,
      addressNeighborhood: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
    },
  })

  // PDV needs userId for Order creation — map accordingly
  const mapped = customers.map((c) => ({
    id: c.userId ?? c.id, // Use userId if linked, otherwise customer id (walk-in fallback)
    customerId: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    addressStreet: c.addressStreet,
    addressNumber: c.addressNumber,
    addressComplement: c.addressComplement,
    addressNeighborhood: c.addressNeighborhood,
    addressCity: c.addressCity,
    addressState: c.addressState,
    addressZip: c.addressZip,
  }))

  return NextResponse.json(mapped)
}
