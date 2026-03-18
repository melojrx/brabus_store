import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { categoryAdminInclude, serializeCategoryTree } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
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

    const currentCategory = await prisma.category.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    })

    if (!currentCategory) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 })
    }

    if (parentId) {
      if (parentId === id) {
        return NextResponse.json({ error: "Uma categoria não pode ser pai dela mesma." }, { status: 400 })
      }

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

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        icon: icon ?? null,
        active,
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
    return NextResponse.json(serializeCategoryTree(category))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params

    const [productsCount, childrenCount] = await Promise.all([
      prisma.product.count({ where: { categoryId: id } }),
      prisma.category.count({ where: { parentId: id } }),
    ])

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: há ${childrenCount} subcategoria(s) vinculada(s).` },
        { status: 400 }
      )
    }

    if (productsCount > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: há ${productsCount} produto(s) nesta categoria.` },
        { status: 400 }
      )
    }
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
