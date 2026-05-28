import { z } from "zod"
import { requireIntegrationScope, IntegrationAuthError } from "@/lib/integrations/auth"
import { integrationSuccess, integrationError } from "@/lib/integrations/response"
import {
  normalizeProductPayload,
  productWithRelationsInclude,
  serializeProduct,
} from "@/lib/catalog-api"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const variantSchema = z.object({
  sku: z.string().nullish(),
  name: z.string().nullish(),
  size: z.string().nullish(),
  color: z.string().nullish(),
  flavor: z.string().nullish(),
  stock: z.union([z.number(), z.string()]).nullish(),
  active: z.boolean().nullish(),
})

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().default(""),
  price: z.union([z.number(), z.string()]),
  costPrice: z.union([z.number(), z.string()]).nullish(),
  images: z.union([z.array(z.string()), z.string()]).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  isNew: z.boolean().optional(),
  weight: z.string().nullish(),
  weightLabel: z.string().nullish(),
  weightKg: z.union([z.number(), z.string()]).nullish(),
  gender: z.string().nullish(),
  categoryId: z.string().min(1),
  variants: z.array(variantSchema).optional(),
})

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

export async function POST(req: Request) {
  try {
    await requireIntegrationScope(req, "write:products")

    const body = await req.json()
    const parsed = createProductSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return integrationError("VALIDATION_ERROR", message, 400)
    }

    const { productData, variants } = normalizeProductPayload(parsed.data)

    if (!productData.name || !productData.slug || !productData.categoryId) {
      return integrationError("VALIDATION_ERROR", "name, slug e categoryId são obrigatórios.", 400)
    }

    const category = await prisma.category.findUnique({
      where: { id: productData.categoryId },
      select: { id: true, parentId: true },
    })

    if (!category) {
      return integrationError("NOT_FOUND", "Categoria não encontrada.", 404)
    }

    if (!category.parentId) {
      return integrationError("VALIDATION_ERROR", "categoryId deve ser uma subcategoria (com parentId).", 400)
    }

    const existingSlug = await prisma.product.findUnique({
      where: { slug: productData.slug },
      select: { id: true },
    })

    if (existingSlug) {
      return integrationError("CONFLICT", `Slug "${productData.slug}" já está em uso.`, 409)
    }

    const product = await prisma.product.create({
      data: {
        ...productData,
        variants: {
          create: variants.map((v) => ({
            sku: v.sku,
            name: v.name,
            size: v.size,
            color: v.color,
            flavor: v.flavor,
            stock: v.stock,
            active: v.active,
          })),
        },
      },
      include: productWithRelationsInclude,
    })

    return integrationSuccess(serializeProduct(product), null, { status: 201 })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return integrationError("CONFLICT", "Slug ou SKU duplicado.", 409)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
