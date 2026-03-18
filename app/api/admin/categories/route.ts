import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { categoryAdminInclude, serializeCategoryTree } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await prisma.category.findMany({
    include: categoryAdminInclude,
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  })

  const serializedCategories = categories.map(serializeCategoryTree)
  const tree = serializedCategories.filter((category) => category.parentId === null)

  return NextResponse.json({
    items: serializedCategories,
    tree,
  })
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json()
    const {
      name,
      slug,
      active,
      icon,
      parentId,
      sortOrder,
      supportsSize,
      supportsColor,
      supportsFlavor,
      supportsWeight,
      trackStockByVariant,
    } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Nome e slug são obrigatórios." }, { status: 400 })
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true },
      })

      if (!parent) {
        return NextResponse.json({ error: "Categoria pai não encontrada." }, { status: 404 })
      }

      if (parent.parentId) {
        return NextResponse.json({ error: "A hierarquia suporta apenas categoria e subcategoria." }, { status: 400 })
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        icon: icon ?? null,
        active: active ?? true,
        parentId: parentId ?? null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : Number.parseInt(String(sortOrder ?? 0), 10) || 0,
        supportsSize: supportsSize ?? false,
        supportsColor: supportsColor ?? false,
        supportsFlavor: supportsFlavor ?? false,
        supportsWeight: supportsWeight ?? false,
        trackStockByVariant: trackStockByVariant ?? false,
      },
      include: categoryAdminInclude,
    })

    return NextResponse.json(serializeCategoryTree(category), { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
