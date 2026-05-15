import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    await requireIntegrationScope(req, "read:stock")

    const { searchParams } = new URL(req.url)
    const thresholdParam = searchParams.get("threshold")
    const threshold = Number(thresholdParam)
    const resolvedThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 3

    const variants = await prisma.productVariant.findMany({
      where: {
        active: true,
        stock: { lte: resolvedThreshold },
        product: { active: true },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        size: true,
        color: true,
        flavor: true,
        stock: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: {
              select: {
                name: true,
                parent: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { stock: "asc" },
    })

    const items = variants.map((v) => ({
      variantId: v.id,
      sku: v.sku,
      variantName: v.name,
      size: v.size,
      color: v.color,
      flavor: v.flavor,
      stock: v.stock,
      productId: v.product.id,
      productName: v.product.name,
      productSlug: v.product.slug,
      categoryName: v.product.category.parent?.name ?? v.product.category.name,
      subcategoryName: v.product.category.parent ? v.product.category.name : null,
    }))

    return integrationSuccess(items, { threshold: resolvedThreshold, count: items.length })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
