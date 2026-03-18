import { NextResponse } from "next/server"
import { productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params

    const product = await prisma.product.findUnique({
      where: { slug: resolvedParams.slug },
      include: productWithRelationsInclude,
    })

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }

    return NextResponse.json(serializeProduct(product))
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}
