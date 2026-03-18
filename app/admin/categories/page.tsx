import CategoriesManager from "./CategoriesManager"
import { categoryAdminInclude, serializeCategoryTree } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

export default async function AdminCategories() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: categoryAdminInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  const serialized = categories.map(serializeCategoryTree)

  return <CategoriesManager initialCategories={serialized} />
}
