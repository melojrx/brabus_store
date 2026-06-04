import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireIntegrationScope(req, "read:sellers")

    const { id } = await params

    const seller = await prisma.seller.findUnique({
      where: { id },
    })

    if (!seller) {
      return integrationError("NOT_FOUND", "Vendedor não encontrado.", 404)
    }

    return integrationSuccess({
      ...seller,
      createdAt: seller.createdAt.toISOString(),
      updatedAt: seller.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    console.error("[sellers/detail]", error)
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}