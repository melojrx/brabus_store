import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    await requireIntegrationScope(req, "read:categories")

    const categories = await prisma.category.findMany({
      where: { active: true, parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        sortOrder: true,
        supportsSize: true,
        supportsColor: true,
        supportsFlavor: true,
        supportsWeight: true,
        children: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            sortOrder: true,
            supportsSize: true,
            supportsColor: true,
            supportsFlavor: true,
            supportsWeight: true,
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return integrationSuccess(categories)
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
