import { NextResponse } from "next/server"
import { categoryAdminInclude, serializeCategoryTree } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      include: categoryAdminInclude,
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    })

    const serializedCategories = categories.map(serializeCategoryTree)
    const tree = serializedCategories
      .filter((category) => category.parentId === null)
      .map((category) => ({
        ...category,
        children: category.children.filter((child) => child.active),
      }))

    return NextResponse.json({
      items: serializedCategories,
      tree,
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: body.slug,
        icon: body.icon ?? null,
        active: body.active ?? true,
        parentId: body.parentId ?? null,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : Number.parseInt(String(body.sortOrder ?? 0), 10) || 0,
        supportsSize: body.supportsSize ?? false,
        supportsColor: body.supportsColor ?? false,
        supportsFlavor: body.supportsFlavor ?? false,
        supportsWeight: body.supportsWeight ?? false,
        trackStockByVariant: body.trackStockByVariant ?? false,
      },
      include: categoryAdminInclude,
    })

    return NextResponse.json(serializeCategoryTree(category), { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}
