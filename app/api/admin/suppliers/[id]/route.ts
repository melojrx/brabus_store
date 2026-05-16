import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { cleanDocument, validateCpf, validateCnpj } from "@/lib/customers"
import { serializeSupplier } from "@/lib/suppliers"
import { isStaffRole } from "@/lib/auth-guard"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.supplier.findUnique({ where: { id } })

  if (!existing) {
    return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 })
  }

  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if (body.email !== undefined) data.email = typeof body.email === "string" ? body.email.trim() || null : null
    if (body.phone !== undefined) data.phone = typeof body.phone === "string" ? body.phone.trim() || null : null
    if (body.personType !== undefined) {
      data.personType = body.personType === "PF" || body.personType === "PJ" ? body.personType : null
    }
    if (body.stateRegistration !== undefined) {
      data.stateRegistration = typeof body.stateRegistration === "string" ? body.stateRegistration.trim() || null : null
    }
    if (body.contactName !== undefined) {
      data.contactName = typeof body.contactName === "string" ? body.contactName.trim() || null : null
    }
    if (body.notes !== undefined) data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null

    if (body.cpf !== undefined) {
      const cpfRaw = typeof body.cpf === "string" ? cleanDocument(body.cpf) || null : null
      if (cpfRaw) {
        if (!validateCpf(cpfRaw)) {
          return NextResponse.json({ error: "CPF inválido." }, { status: 400 })
        }
        const dup = await prisma.supplier.findUnique({ where: { cpf: cpfRaw } })
        if (dup && dup.id !== id) {
          return NextResponse.json({ error: "CPF já cadastrado." }, { status: 409 })
        }
      }
      data.cpf = cpfRaw
    }

    if (body.cnpj !== undefined) {
      const cnpjRaw = typeof body.cnpj === "string" ? cleanDocument(body.cnpj) || null : null
      if (cnpjRaw) {
        if (!validateCnpj(cnpjRaw)) {
          return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 })
        }
        const dup = await prisma.supplier.findUnique({ where: { cnpj: cnpjRaw } })
        if (dup && dup.id !== id) {
          return NextResponse.json({ error: "CNPJ já cadastrado." }, { status: 409 })
        }
      }
      data.cnpj = cnpjRaw
    }

    const addressFields = [
      "addressStreet", "addressNumber", "addressComplement",
      "addressNeighborhood", "addressCity", "addressState", "addressZip",
    ] as const
    for (const field of addressFields) {
      if (body[field] !== undefined) {
        data[field] = typeof body[field] === "string" ? body[field].trim() || null : null
      }
    }

    const updated = await prisma.supplier.update({ where: { id }, data })

    return NextResponse.json({ ok: true, data: serializeSupplier(updated) })
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json({ error: "Erro interno ao atualizar fornecedor." }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.supplier.findUnique({ where: { id } })

  if (!existing) {
    return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 })
  }

  await prisma.supplier.update({ where: { id }, data: { active: false } })

  return NextResponse.json({ ok: true })
}
