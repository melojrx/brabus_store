import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import { getAdminDashboardData, parseDashboardPeriod } from "@/lib/admin-dashboard"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    await requireIntegrationScope(req, "read:dashboard")

    const { searchParams } = new URL(req.url)
    const period = parseDashboardPeriod(searchParams.get("period"))

    const data = await getAdminDashboardData(prisma, 1, 8, period)

    return integrationSuccess(data)
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
