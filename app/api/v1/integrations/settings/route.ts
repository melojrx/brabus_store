import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import { getPublicStoreSettings } from "@/lib/store-settings"

export async function GET(req: Request) {
  try {
    await requireIntegrationScope(req, "read:settings")

    const settings = await getPublicStoreSettings()

    return integrationSuccess(settings)
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
