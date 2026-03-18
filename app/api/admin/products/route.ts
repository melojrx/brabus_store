import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  normalizeProductPayload,
  productWithRelationsInclude,
  serializeProduct,
} from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

// Middleware manual para checar Admin
async function checkAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== "ADMIN") {
    return false
  }
  return true
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const products = await prisma.product.findMany({
      include: productWithRelationsInclude,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products.map(serializeProduct))
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()

    const { productData, variants } = normalizeProductPayload(body)
    if (!productData.name || !productData.slug || !productData.categoryId) {
      return NextResponse.json({ error: "Nome, slug e subcategoria são obrigatórios." }, { status: 400 })
    }

    const category = await prisma.category.findUnique({
      where: { id: productData.categoryId },
      select: { id: true, parentId: true, active: true },
    })

    if (!category) {
      return NextResponse.json({ error: "Subcategoria não encontrada." }, { status: 404 })
    }

    if (!category.parentId) {
      return NextResponse.json({ error: "Selecione uma subcategoria válida, não a categoria pai." }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        ...productData,
        variants: {
          create: variants.map((variant) => ({
            sku: variant.sku,
            name: variant.name,
            size: variant.size,
            color: variant.color,
            flavor: variant.flavor,
            stock: variant.stock,
            active: variant.active,
          })),
        },
      },
      include: productWithRelationsInclude,
    })

    return NextResponse.json(serializeProduct(product), { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
