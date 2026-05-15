import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import { productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    await requireIntegrationScope(req, "read:products")

    const { idOrSlug } = await params
    const decoded = decodeURIComponent(idOrSlug)

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: decoded },
          { slug: decoded },
        ],
      },
      include: productWithRelationsInclude,
    })

    if (!product) {
      return integrationError("NOT_FOUND", "Produto não encontrado.", 404)
    }

    return integrationSuccess(serializeProduct(product))
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
