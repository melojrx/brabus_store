import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import crypto from "crypto"
import { auth } from "@/auth"
import { isStaffRole } from "@/lib/auth-guard"
import prisma from "@/lib/prisma"
import { Prisma, Role } from "@prisma/client"

async function checkAdmin() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) return null
  return session
}

function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12)
}

export async function GET(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const roleFilter = searchParams.get("role")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 20))

  const where: Prisma.UserWhereInput = {
    role: { in: [Role.ADMIN, Role.SELLER] },
  }

  if (roleFilter === "ADMIN" || roleFilter === "SELLER") {
    where.role = roleFilter
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }

  const [totalItems, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
        seller: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  return NextResponse.json({
    data: serialized,
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
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : null
    const role = body.role === "ADMIN" || body.role === "SELLER" ? body.role : null

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 })
    }
    if (!role) {
      return NextResponse.json({ error: "Perfil (ADMIN ou SELLER) é obrigatório." }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email já cadastrado." }, { status: 409 })
    }

    const temporaryPassword = generateTemporaryPassword()
    const hashedPassword = await hash(temporaryPassword, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role,
        mustChangePassword: true,
      },
    })

    // If SELLER, auto-create linked Seller record
    if (role === "SELLER") {
      await prisma.seller.create({
        data: {
          name,
          email,
          phone,
          userId: user.id,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      temporaryPassword,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Erro interno ao criar usuário." }, { status: 500 })
  }
}
