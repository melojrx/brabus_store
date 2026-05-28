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
  id: z.string().optional(),
  sku: z.string().nullish(),
  name: z.string().nullish(),
  size: z.string().nullish(),
  color: z.string().nullish(),
  flavor: z.string().nullish(),
  stock: z.union([z.number(), z.string()]).nullish(),
  active: z.boolean().nullish(),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  costPrice: z.union([z.number(), z.string()]).nullish(),
  images: z.union([z.array(z.string()), z.string()]).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  isNew: z.boolean().optional(),
  weight: z.string().nullish(),
  weightLabel: z.string().nullish(),
  weightKg: z.union([z.number(), z.string()]).nullish(),
  gender: z.string().nullish(),
  categoryId: z.string().min(1).optional(),
  variants: z.array(variantSchema).optional(),
})

const toggleSchema = z.object({
  active: z.boolean(),
})

async function findProduct(idOrSlug: string) {
  const decoded = decodeURIComponent(idOrSlug)
  return prisma.product.findFirst({
    where: { OR: [{ id: decoded }, { slug: decoded }] },
    include: productWithRelationsInclude,
  })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    await requireIntegrationScope(req, "read:products")

    const { idOrSlug } = await params
    const product = await findProduct(idOrSlug)

    if (!product) {
      return integrationError("NOT_FOUND", "Produto não encontrado.", 404)
    }

    return integrationSuccess(serializeProduct(product))
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    await requireIntegrationScope(req, "write:products")

    const { idOrSlug } = await params
    const existing = await findProduct(idOrSlug)

    if (!existing) {
      return integrationError("NOT_FOUND", "Produto não encontrado.", 404)
    }

    const body = await req.json()
    const parsed = updateProductSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return integrationError("VALIDATION_ERROR", message, 400)
    }

    const payload = {
      name: parsed.data.name ?? existing.name,
      slug: parsed.data.slug ?? existing.slug,
      description: parsed.data.description ?? existing.description,
      price: parsed.data.price ?? existing.price.toNumber(),
      costPrice: parsed.data.costPrice !== undefined ? parsed.data.costPrice : existing.costPrice?.toNumber() ?? null,
      images: parsed.data.images ?? existing.images,
      featured: parsed.data.featured ?? existing.featured,
      active: parsed.data.active ?? existing.active,
      isNew: parsed.data.isNew ?? existing.isNew,
      weight: parsed.data.weight !== undefined ? parsed.data.weight : existing.weight,
      weightLabel: parsed.data.weightLabel !== undefined ? parsed.data.weightLabel : existing.weightLabel,
      weightKg: parsed.data.weightKg !== undefined ? parsed.data.weightKg : existing.weightKg,
      gender: parsed.data.gender !== undefined ? parsed.data.gender : existing.gender,
      categoryId: parsed.data.categoryId ?? existing.categoryId,
      variants: parsed.data.variants,
    }

    const { productData, variants } = normalizeProductPayload(payload)

    if (productData.categoryId !== existing.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId },
        select: { id: true, parentId: true },
      })
      if (!category) return integrationError("NOT_FOUND", "Categoria não encontrada.", 404)
      if (!category.parentId) return integrationError("VALIDATION_ERROR", "categoryId deve ser uma subcategoria.", 400)
    }

    if (productData.slug !== existing.slug) {
      const slugTaken = await prisma.product.findFirst({
        where: { slug: productData.slug, id: { not: existing.id } },
        select: { id: true },
      })
      if (slugTaken) return integrationError("CONFLICT", `Slug "${productData.slug}" já está em uso.`, 409)
    }

    const incomingVariantIds = variants
      .map((v) => v.id)
      .filter((id): id is string => Boolean(id))

    if (incomingVariantIds.length > 0) {
      const existingVariantIds = new Set(existing.variants.map((v) => v.id))
      const invalid = incomingVariantIds.filter((id) => !existingVariantIds.has(id))
      if (invalid.length > 0) {
        return integrationError("VALIDATION_ERROR", "Variantes com IDs inválidos para este produto.", 400)
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: existing.id }, data: productData })

      await tx.productVariant.deleteMany({
        where: incomingVariantIds.length > 0
          ? { productId: existing.id, id: { notIn: incomingVariantIds } }
          : { productId: existing.id },
      })

      for (const variant of variants) {
        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { sku: variant.sku, name: variant.name, size: variant.size, color: variant.color, flavor: variant.flavor, stock: variant.stock, active: variant.active },
          })
        } else {
          await tx.productVariant.create({
            data: { productId: existing.id, sku: variant.sku, name: variant.name, size: variant.size, color: variant.color, flavor: variant.flavor, stock: variant.stock, active: variant.active },
          })
        }
      }

      return tx.product.findUniqueOrThrow({ where: { id: existing.id }, include: productWithRelationsInclude })
    })

    return integrationSuccess(serializeProduct(product))
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    await requireIntegrationScope(req, "write:products")

    const { idOrSlug } = await params
    const existing = await findProduct(idOrSlug)

    if (!existing) {
      return integrationError("NOT_FOUND", "Produto não encontrado.", 404)
    }

    const body = await req.json()
    const parsed = toggleSchema.safeParse(body)

    if (!parsed.success) {
      return integrationError("VALIDATION_ERROR", "Campo 'active' (boolean) é obrigatório.", 400)
    }

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: { active: parsed.data.active },
      select: { id: true, slug: true, active: true },
    })

    return integrationSuccess(updated)
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  try {
    await requireIntegrationScope(req, "write:products")

    const { idOrSlug } = await params
    const existing = await findProduct(idOrSlug)

    if (!existing) {
      return integrationError("NOT_FOUND", "Produto não encontrado.", 404)
    }

    await prisma.$transaction([
      prisma.product.update({ where: { id: existing.id }, data: { active: false } }),
      prisma.productVariant.updateMany({ where: { productId: existing.id }, data: { active: false } }),
    ])

    return integrationSuccess({ id: existing.id, slug: existing.slug, active: false })
  } catch (error) {
    if (error instanceof IntegrationAuthError) {
      return integrationError(error.code, error.message, error.status)
    }
    return integrationError("INTERNAL_ERROR", "Erro interno.", 500)
  }
}
