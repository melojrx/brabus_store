import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import { findExpiringVariants, type ExpiryAlertLevel } from "@/lib/expiry-alerts"

const VALID_LEVELS: ExpiryAlertLevel[] = ["warning", "critical", "expired"]

export async function GET(req: Request) {
  try {
    await requireIntegrationScope(req, "read:stock")

    const { searchParams } = new URL(req.url)
    const levelParam = searchParams.get("level")
    const levels = levelParam && VALID_LEVELS.includes(levelParam as ExpiryAlertLevel)
      ? [levelParam as ExpiryAlertLevel]
      : undefined

    const items = await findExpiringVariants({ levels })

    return integrationSuccess(
      items.map((item) => ({
        variantId: item.variantId,
        sku: item.sku,
        variantLabel: item.variantLabel,
        stock: item.stock,
        expiresAt: item.expiresAt.toISOString(),
        daysLeft: item.daysLeft,
        level: item.level,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        categoryName: item.categoryName,
        subcategoryName: item.subcategoryName,
      })),
      { count: items.length, level: levelParam ?? "all" },
    )
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
