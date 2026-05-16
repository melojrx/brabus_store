import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { cleanDocument, validateCpf, validateCnpj, serializeCustomer } from "@/lib/customers"
import { Prisma } from "@prisma/client"
import { isStaffRole } from "@/lib/auth-guard"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

export async function GET(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const personType = searchParams.get("personType")?.trim() ?? ""
  const activeParam = searchParams.get("active")
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE))

  const where: Prisma.CustomerWhereInput = {}

  if (activeParam === "true") where.active = true
  else if (activeParam === "false") where.active = false

  if (personType === "PF" || personType === "PJ") {
    where.personType = personType
  }

  if (search) {
    const cleanSearch = search.replace(/\D/g, "")
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      ...(cleanSearch.length >= 3 ? [{ cpf: { contains: cleanSearch } }] : []),
      ...(cleanSearch.length >= 3 ? [{ cnpj: { contains: cleanSearch } }] : []),
    ]
  }

  const [totalItems, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    data: customers.map(serializeCustomer),
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
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
      const existing = await prisma.customer.findUnique({ where: { cpf: cpfRaw } })
      if (existing) {
        return NextResponse.json({ error: "CPF já cadastrado." }, { status: 409 })
      }
    }

    if (cnpjRaw) {
      const existing = await prisma.customer.findUnique({ where: { cnpj: cnpjRaw } })
      if (existing) {
        return NextResponse.json({ error: "CNPJ já cadastrado." }, { status: 409 })
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        cpf: cpfRaw,
        cnpj: cnpjRaw,
        personType,
        stateRegistration,
        notes,
        addressStreet: typeof body.addressStreet === "string" ? body.addressStreet.trim() || null : null,
        addressNumber: typeof body.addressNumber === "string" ? body.addressNumber.trim() || null : null,
        addressComplement: typeof body.addressComplement === "string" ? body.addressComplement.trim() || null : null,
        addressNeighborhood: typeof body.addressNeighborhood === "string" ? body.addressNeighborhood.trim() || null : null,
        addressCity: typeof body.addressCity === "string" ? body.addressCity.trim() || null : null,
        addressState: typeof body.addressState === "string" ? body.addressState.trim() || null : null,
        addressZip: typeof body.addressZip === "string" ? body.addressZip.trim() || null : null,
      },
    })

    return NextResponse.json({ ok: true, data: serializeCustomer(customer) }, { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json({ error: "Erro interno ao criar cliente." }, { status: 500 })
  }
}
