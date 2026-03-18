import { NextResponse } from "next/server"
import { calculateOrderWeight, fetchMelhorEnvioServices, normalizePostalCode, type ShippingCartItemInput } from "@/lib/shipping"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const toPostalCode = normalizePostalCode(String(body.toPostalCode ?? ""))
    const rawItems = Array.isArray(body.items) ? (body.items as ShippingCartItemInput[]) : []
    const directWeight = Number(body.weightKg)

    if (!toPostalCode || toPostalCode.length !== 8) {
      return NextResponse.json({ error: "CEP destino inválido." }, { status: 400 })
    }

    const weightKg =
      rawItems.length > 0
        ? await calculateOrderWeight(prisma, rawItems)
        : Number.isFinite(directWeight) && directWeight > 0
          ? directWeight
          : 0

    if (weightKg <= 0) {
      return NextResponse.json({ error: "Peso total do pedido inválido." }, { status: 400 })
    }

    const services = await fetchMelhorEnvioServices({
      toPostalCode,
      weightKg,
      height: Number(body.height) || 10,
      width: Number(body.width) || 20,
      length: Number(body.length) || 20,
    })

    return NextResponse.json({ services, weightKg })
  } catch (error) {
    console.error("Erro ao calcular frete:", error)
    return NextResponse.json({ error: "Erro ao calcular frete" }, { status: 500 })
  }
}
