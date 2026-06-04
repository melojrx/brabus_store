import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireIntegrationScope(req, "read:suppliers")

    const { id } = await params

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!supplier) {
      return integrationError("NOT_FOUND", "Fornecedor não encontrado.", 404)
    }

    return integrationSuccess({
      ...supplier,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    console.error("[suppliers/detail]", error)
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}