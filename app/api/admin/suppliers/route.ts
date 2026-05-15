import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { cleanDocument, validateCpf, validateCnpj } from "@/lib/customers"
import { serializeSupplier } from "@/lib/suppliers"
import { Prisma } from "@prisma/client"

async function checkAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== "ADMIN") return null
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

  const where: Prisma.SupplierWhereInput = {}

  if (activeParam === "true") where.active = true
  else if (activeParam === "false") where.active = false

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
    ]
  }

  const [totalItems, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    data: suppliers.map(serializeSupplier),
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
    const personType = body.personType === "PF" || body.personType === "PJ" ? body.personType : null
    const cpfRaw = typeof body.cpf === "string" ? cleanDocument(body.cpf) || null : null
    const cnpjRaw = typeof body.cnpj === "string" ? cleanDocument(body.cnpj) || null : null
    const stateRegistration = typeof body.stateRegistration === "string" ? body.stateRegistration.trim() || null : null
    const contactName = typeof body.contactName === "string" ? body.contactName.trim() || null : null
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
    }

    if (cpfRaw && !validateCpf(cpfRaw)) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 })
    }

    if (cnpjRaw && !validateCnpj(cnpjRaw)) {
      return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 })
    }

    if (cpfRaw) {
      const existing = await prisma.supplier.findUnique({ where: { cpf: cpfRaw } })
      if (existing) {
        return NextResponse.json({ error: "CPF já cadastrado." }, { status: 409 })
      }
    }

    if (cnpjRaw) {
      const existing = await prisma.supplier.findUnique({ where: { cnpj: cnpjRaw } })
      if (existing) {
        return NextResponse.json({ error: "CNPJ já cadastrado." }, { status: 409 })
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name, email, phone, cpf: cpfRaw, cnpj: cnpjRaw,
        personType, stateRegistration, contactName, notes,
        addressStreet: typeof body.addressStreet === "string" ? body.addressStreet.trim() || null : null,
        addressNumber: typeof body.addressNumber === "string" ? body.addressNumber.trim() || null : null,
        addressComplement: typeof body.addressComplement === "string" ? body.addressComplement.trim() || null : null,
        addressNeighborhood: typeof body.addressNeighborhood === "string" ? body.addressNeighborhood.trim() || null : null,
        addressCity: typeof body.addressCity === "string" ? body.addressCity.trim() || null : null,
        addressState: typeof body.addressState === "string" ? body.addressState.trim() || null : null,
        addressZip: typeof body.addressZip === "string" ? body.addressZip.trim() || null : null,
      },
    })

    return NextResponse.json({ ok: true, data: serializeSupplier(supplier) }, { status: 201 })
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Erro interno ao criar fornecedor." }, { status: 500 })
  }
}
