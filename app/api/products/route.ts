import { NextResponse } from "next/server"
import { buildCatalogProductWhere, productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const whereClause = buildCatalogProductWhere(searchParams)

    const products = await prisma.product.findMany({
      where: whereClause,
      include: productWithRelationsInclude,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products.map(serializeProduct))
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}
