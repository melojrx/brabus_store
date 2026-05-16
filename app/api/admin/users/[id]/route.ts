import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isStaffRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"

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
  const existing = await prisma.user.findUnique({ where: { id } })

  if (!existing || existing.role === "CUSTOMER") {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  }

  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if (typeof body.email === "string" && body.email.trim()) {
      const email = body.email.trim().toLowerCase()
      if (email !== existing.email) {
        const dup = await prisma.user.findUnique({ where: { email } })
        if (dup) {
          return NextResponse.json({ error: "Email já cadastrado." }, { status: 409 })
        }
        data.email = email
      }
    }
    if (body.phone !== undefined) {
      data.phone = typeof body.phone === "string" ? body.phone.trim() || null : null
    }
    if (body.role === "ADMIN" || body.role === "SELLER") {
      data.role = body.role

      // If changing to SELLER and no linked Seller exists, create one
      if (body.role === "SELLER" && existing.role !== "SELLER") {
        const existingSeller = await prisma.seller.findUnique({ where: { userId: id } })
        if (!existingSeller) {
          await prisma.seller.create({
            data: {
              name: (data.name as string) ?? existing.name,
              email: (data.email as string) ?? existing.email,
              phone: (data.phone as string) ?? existing.phone,
              userId: id,
            },
          })
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    })

    return NextResponse.json({ ok: true, data: { ...updated, createdAt: updated.createdAt.toISOString() } })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Erro interno ao atualizar usuário." }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await checkAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ error: "Não é possível desativar seu próprio usuário." }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { id } })

  if (!existing || existing.role === "CUSTOMER") {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  }

  // Deactivate linked seller if exists
  const linkedSeller = await prisma.seller.findUnique({ where: { userId: id } })
  if (linkedSeller) {
    await prisma.seller.update({ where: { id: linkedSeller.id }, data: { active: false } })
  }

  // Set role to CUSTOMER effectively disabling admin access
  await prisma.user.update({
    where: { id },
    data: { role: "CUSTOMER" },
  })

  return NextResponse.json({ ok: true })
}
