import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import {
  normalizePhone,
  normalizeZip,
  profileUpdateSchema,
  serializeAccountProfile,
} from "@/lib/account"

const accountProfileSelect = {
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
} as const

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: accountProfileSelect,
  })

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  }

  return NextResponse.json(serializeAccountProfile(user))
}

export async function PUT(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const payload = profileUpdateSchema.parse(body)

    const emailOwner = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    })

    if (emailOwner && emailOwner.id !== session.user.id) {
      return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: payload.name,
        email: payload.email,
        phone: normalizePhone(payload.phone),
        addressStreet: payload.addressStreet,
        addressNumber: payload.addressNumber,
        addressComplement: payload.addressComplement,
        addressNeighborhood: payload.addressNeighborhood,
        addressCity: payload.addressCity,
        addressState: payload.addressState,
        addressZip: normalizeZip(payload.addressZip),
      },
      select: accountProfileSelect,
    })

    return NextResponse.json(serializeAccountProfile(updatedUser))
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível atualizar o perfil." }, { status: 400 })
  }
}
