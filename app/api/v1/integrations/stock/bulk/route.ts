import { z } from "zod"
import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

const bulkItemSchema = z.object({
  variantId: z.string().min(1),
  stock: z.number().int().min(0).optional(),
  adjustment: z.number().int().optional(),
}).refine((data) => data.stock !== undefined || data.adjustment !== undefined, {
  message: "Cada item deve ter 'stock' ou 'adjustment'.",
})

const bulkUpdateSchema = z.object({
  updates: z.array(bulkItemSchema).min(1).max(100),
})

export async function PATCH(req: Request) {
  try {
    await requireIntegrationScope(req, "write:stock")

    const body = await req.json()
    const parsed = bulkUpdateSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return integrationError("VALIDATION_ERROR", message, 400)
    }

    const variantIds = parsed.data.updates.map((u) => u.variantId)
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, stock: true },
    })

    const variantMap = new Map(variants.map((v) => [v.id, v]))
    const notFound = variantIds.filter((id) => !variantMap.has(id))

    if (notFound.length > 0) {
      return integrationError("NOT_FOUND", `Variantes não encontradas: ${notFound.join(", ")}`, 404)
    }

    const results = await prisma.$transaction(
      parsed.data.updates.map((update) => {
        const current = variantMap.get(update.variantId)!
        const newStock = update.stock !== undefined
          ? update.stock
          : Math.max(0, current.stock + update.adjustment!)

        return prisma.productVariant.update({
          where: { id: update.variantId },
          data: { stock: newStock },
          select: { id: true, sku: true, name: true, stock: true, productId: true },
        })
      }),
    )

    return integrationSuccess(results)
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
