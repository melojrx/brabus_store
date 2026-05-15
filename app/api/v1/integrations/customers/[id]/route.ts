import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireIntegrationScope(req, "read:customers")

    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!customer) {
      return integrationError("NOT_FOUND", "Cliente não encontrado.", 404)
    }

    return integrationSuccess({
      ...customer,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
