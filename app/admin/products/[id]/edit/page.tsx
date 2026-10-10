import { auth } from "@/auth"
import { isAdminRole } from "@/lib/auth-guard"
import { notFound } from "next/navigation"
import ProductsManager from "../../ProductsManager"
import { getProductEditorData } from "../../product-editor-data"
import { productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const canManageCosts = isAdminRole(session?.user?.role)
  const { id } = await params
  const [categories, product] = await Promise.all([getProductEditorData(), prisma.product.findUnique({ where: { id }, include: productWithRelationsInclude })])
  if (!product) notFound()
  return <ProductsManager canManageCosts={canManageCosts} initialProducts={[]} categories={categories} filters={{ search: "", status: "", parentCategory: "", subcategory: "", featured: "", expiry: "" }} expiryThresholds={{ warningDays: 30, criticalDays: 7 }} pagination={{ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }} editorProduct={serializeProduct(product, { includeCosts: canManageCosts })} />
}
