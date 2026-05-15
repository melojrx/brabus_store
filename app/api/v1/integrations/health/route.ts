import { requireIntegrationAuth, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"

export async function GET(req: Request) {
  try {
    await requireIntegrationAuth(req)

    return integrationSuccess({
      service: "brabus-store",
      status: "ok",
    })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
