import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { cleanDocument, validateCpf } from "@/lib/customers"
import { serializeSeller } from "@/lib/sellers"
import { Prisma } from "@prisma/client"
import { isStaffRole } from "@/lib/auth-guard"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}

export async function GET(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const activeParam = searchParams.get("active")
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 20))

  const where: Prisma.SellerWhereInput = {}

  if (activeParam === "true") where.active = true
  else if (activeParam === "false") where.active = false

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ]
  }

  const [totalItems, sellers] = await Promise.all([
    prisma.seller.count({ where }),
    prisma.seller.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    data: sellers.map(serializeSeller),
    meta: { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) },
  })
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim() || null : null
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : null
    const cpfRaw = typeof body.cpf === "string" ? cleanDocument(body.cpf) || null : null
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
    }

    if (cpfRaw && !validateCpf(cpfRaw)) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 })
    }

    if (cpfRaw) {
      const existing = await prisma.seller.findUnique({ where: { cpf: cpfRaw } })
      if (existing) {
        return NextResponse.json({ error: "CPF já cadastrado." }, { status: 409 })
      }
    }

    const seller = await prisma.seller.create({
      data: { name, email, phone, cpf: cpfRaw, notes },
    })

    return NextResponse.json({ ok: true, data: serializeSeller(seller) }, { status: 201 })
  } catch (error) {
    console.error("Error creating seller:", error)
    return NextResponse.json({ error: "Erro interno ao criar vendedor." }, { status: 500 })
  }
}
