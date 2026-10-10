import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { isAdminRole, isStaffRole } from "@/lib/auth-guard"
import {
  normalizeProductPayload,
  productWithRelationsInclude,
  serializeProduct,
} from "@/lib/catalog-api"
import prisma from "@/lib/prisma"
import { protectProductCost, ProductCostAccessError } from "@/lib/product-cost-access"

async function checkStaff() {
  const session = await auth()
  if (!session || !isStaffRole(session.user?.role)) {
    return null
  }
  return session
}

export async function GET() {
  const session = await checkStaff()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const products = await prisma.product.findMany({
      include: productWithRelationsInclude,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products.map(product => serializeProduct(product, { includeCosts: isAdminRole(session.user?.role) })))
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await checkStaff()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()

    const normalized = normalizeProductPayload(body)
    const productData = protectProductCost(normalized.productData, body, isAdminRole(session.user?.role))
    const variants = normalized.variants
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
            expiresAt: variant.expiresAt,
            active: variant.active,
          })),
        },
      },
      include: productWithRelationsInclude,
    })

    return NextResponse.json(serializeProduct(product, { includeCosts: isAdminRole(session.user?.role) }), { status: 201 })
  } catch (error) {
    if (error instanceof ProductCostAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
