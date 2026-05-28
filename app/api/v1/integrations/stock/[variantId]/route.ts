import { z } from "zod"
import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import prisma from "@/lib/prisma"

const stockUpdateSchema = z.object({
  stock: z.number().int().min(0).optional(),
  adjustment: z.number().int().optional(),
}).refine((data) => data.stock !== undefined || data.adjustment !== undefined, {
  message: "Informe 'stock' (absoluto) ou 'adjustment' (relativo).",
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ variantId: string }> },
) {
  try {
    await requireIntegrationScope(req, "write:stock")

    const { variantId } = await params
    const body = await req.json()
    const parsed = stockUpdateSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join("; ")
      return integrationError("VALIDATION_ERROR", message, 400)
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, stock: true, productId: true },
    })

    if (!variant) {
      return integrationError("NOT_FOUND", "Variante não encontrada.", 404)
    }

    let newStock: number
    if (parsed.data.stock !== undefined) {
      newStock = parsed.data.stock
    } else {
      newStock = Math.max(0, variant.stock + parsed.data.adjustment!)
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock },
      select: { id: true, sku: true, name: true, stock: true, productId: true },
    })

    return integrationSuccess(updated)
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
