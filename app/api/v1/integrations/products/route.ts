import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import { productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 20

function parsePageParam(value: string | null, defaultValue: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue
  return Math.min(parsed, max)
}

export async function GET(req: Request) {
  try {
    await requireIntegrationScope(req, "read:products")

    const { searchParams } = new URL(req.url)
    const page = parsePageParam(searchParams.get("page"), 1, 1000)
    const pageSize = parsePageParam(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const search = searchParams.get("search")?.trim() ?? ""
    const activeParam = searchParams.get("active")
    const lowStockParam = searchParams.get("lowStock")

    const where: Prisma.ProductWhereInput = {}

    if (activeParam === "true") where.active = true
    else if (activeParam === "false") where.active = false

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    if (lowStockParam === "true") {
      where.variants = {
        some: {
          active: true,
          stock: { lte: 10 },
        },
      }
    }

    const [totalItems, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productWithRelationsInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return integrationSuccess(products.map(serializeProduct), {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
