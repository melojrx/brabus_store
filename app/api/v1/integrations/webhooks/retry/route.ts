import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import { retryFailedDeliveries } from "@/lib/webhooks/retry"

export async function POST(req: Request) {
  try {
    await requireIntegrationScope(req, "manage:webhooks")

    const result = await retryFailedDeliveries()

    return integrationSuccess(result)
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
