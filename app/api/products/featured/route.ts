import { NextResponse } from "next/server"
import { productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { active: true, featured: true },
      include: productWithRelationsInclude,
      take: 8,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products.map(serializeProduct))
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}
