import ProductsManager from "./ProductsManager"
import { productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

export default async function AdminProducts() {
  const [rawProducts, categories] = await Promise.all([
    prisma.product.findMany({
      include: productWithRelationsInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { parentId: { not: null } },
      include: { parent: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ])

  const products = rawProducts.map(serializeProduct)
  const serializedCategories = categories.map((category) => ({
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    parent: category.parent
      ? {
          ...category.parent,
          createdAt: category.parent.createdAt.toISOString(),
          updatedAt: category.parent.updatedAt.toISOString(),
        }
      : null,
  }))

  return <ProductsManager initialProducts={products} categories={serializedCategories} />
}
