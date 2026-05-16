import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { cleanDocument, validateCpf } from "@/lib/customers"
import { serializeSeller } from "@/lib/sellers"
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
  const existing = await prisma.seller.findUnique({ where: { id } })

  if (!existing) {
    return NextResponse.json({ error: "Vendedor não encontrado." }, { status: 404 })
  }

  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if (body.email !== undefined) data.email = typeof body.email === "string" ? body.email.trim() || null : null
    if (body.phone !== undefined) data.phone = typeof body.phone === "string" ? body.phone.trim() || null : null
    if (body.notes !== undefined) data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null

    if (body.cpf !== undefined) {
      const cpfRaw = typeof body.cpf === "string" ? cleanDocument(body.cpf) || null : null
      if (cpfRaw) {
        if (!validateCpf(cpfRaw)) {
          return NextResponse.json({ error: "CPF inválido." }, { status: 400 })
        }
        const dup = await prisma.seller.findUnique({ where: { cpf: cpfRaw } })
        if (dup && dup.id !== id) {
          return NextResponse.json({ error: "CPF já cadastrado." }, { status: 409 })
        }
      }
      data.cpf = cpfRaw
    }

    const updated = await prisma.seller.update({ where: { id }, data })

    return NextResponse.json({ ok: true, data: serializeSeller(updated) })
  } catch (error) {
    console.error("Error updating seller:", error)
    return NextResponse.json({ error: "Erro interno ao atualizar vendedor." }, { status: 500 })
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
  const existing = await prisma.seller.findUnique({ where: { id } })

  if (!existing) {
    return NextResponse.json({ error: "Vendedor não encontrado." }, { status: 404 })
  }

  await prisma.seller.update({ where: { id }, data: { active: false } })

  return NextResponse.json({ ok: true })
}
