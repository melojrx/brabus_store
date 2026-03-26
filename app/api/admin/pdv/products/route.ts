import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { buildVariantDisplayLabel } from "@/lib/pdv"

const PDV_PRODUCTS_PAGE_SIZE = 24

async function checkAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}

export async function GET(req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")?.trim() ?? ""
  const parsedPage = Number.parseInt(searchParams.get("page") ?? "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const where = {
    active: true,
    variants: {
      some: {
        active: true,
      },
    },
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [totalItems, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PDV_PRODUCTS_PAGE_SIZE,
      take: PDV_PRODUCTS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: true,
        category: {
          select: {
            name: true,
            parent: {
              select: {
                name: true,
              },
            },
          },
        },
        variants: {
          where: {
            active: true,
          },
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            size: true,
            color: true,
            flavor: true,
            stock: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    items: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price.toNumber(),
      image: product.images[0] ?? null,
      categoryName: product.category.parent?.name ?? product.category.name,
      subcategoryName: product.category.parent ? product.category.name : null,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        label: buildVariantDisplayLabel(variant),
        size: variant.size,
        color: variant.color,
        flavor: variant.flavor,
        stock: variant.stock,
      })),
    })),
    pagination: {
      page,
      pageSize: PDV_PRODUCTS_PAGE_SIZE,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / PDV_PRODUCTS_PAGE_SIZE)),
    },
  })
}
