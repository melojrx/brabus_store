import prisma from "@/lib/prisma"

export async function getProductEditorData() {
  const categories = await prisma.category.findMany({ where: { parentId: { not: null } }, include: { parent: true }, orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }] })
  return categories.map((category) => ({ ...category, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString(), parent: category.parent ? { ...category.parent, createdAt: category.parent.createdAt.toISOString(), updatedAt: category.parent.updatedAt.toISOString() } : null }))
}
