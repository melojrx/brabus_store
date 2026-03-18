import { Prisma } from "@prisma/client"

export const categoryAdminInclude = {
  parent: true,
  children: {
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
  },
  _count: {
    select: {
      products: true,
      children: true,
    },
  },
} satisfies Prisma.CategoryInclude

export const productWithRelationsInclude = {
  category: {
    include: {
      parent: true,
    },
  },
  variants: {
    orderBy: [{ createdAt: "asc" }],
  },
} satisfies Prisma.ProductInclude

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productWithRelationsInclude
}>

type CategoryWithRelations = Prisma.CategoryGetPayload<{
  include: typeof categoryAdminInclude
}>

type ProductVariantInput = {
  id?: string
  sku?: string | null
  name?: string | null
  size?: string | null
  color?: string | null
  flavor?: string | null
  stock?: number | string | null
  active?: boolean | null
}

type ProductPayloadInput = {
  name?: string
  slug?: string
  description?: string
  price?: number | string
  costPrice?: number | string | null
  images?: string[] | string
  featured?: boolean
  active?: boolean
  isNew?: boolean
  weight?: string | null
  weightLabel?: string | null
  weightKg?: number | string | null
  gender?: string | null
  categoryId?: string
  variants?: ProductVariantInput[]
}

type NormalizedVariant = {
  id?: string
  sku: string | null
  name: string
  size: string | null
  color: string | null
  flavor: string | null
  stock: number
  active: boolean
}

export function mapLegacyTypeToCategorySlug(type: string) {
  const normalizedType = type.trim().toUpperCase()

  if (normalizedType === "SUPPLEMENT") {
    return "suplementos"
  }

  if (normalizedType === "FASHION") {
    return "roupas-fitness"
  }

  if (normalizedType === "ACCESSORY") {
    return "acessorios"
  }

  return null
}

export function buildCatalogProductWhere(searchParams: URLSearchParams): Prisma.ProductWhereInput {
  const category = searchParams.get("category")
  const subcategory = searchParams.get("subcategory")
  const type = searchParams.get("type")

  const where: Prisma.ProductWhereInput = { active: true }
  const andFilters: Prisma.ProductWhereInput[] = []

  if (subcategory) {
    andFilters.push({
      category: { slug: subcategory },
    })
  } else if (category) {
    andFilters.push({
      OR: [
        { category: { slug: category } },
        { category: { parent: { slug: category } } },
      ],
    })
  }

  if (type) {
    const mappedCategorySlug = mapLegacyTypeToCategorySlug(type)
    if (mappedCategorySlug) {
      andFilters.push({
        OR: [
          { category: { slug: mappedCategorySlug } },
          { category: { parent: { slug: mappedCategorySlug } } },
        ],
      })
    }
  }

  if (andFilters.length > 0) {
    where.AND = andFilters
  }

  return where
}

function asNumber(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return null
  }

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function asInteger(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return 0
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeImages(images: ProductPayloadInput["images"]) {
  const normalized = Array.isArray(images)
    ? images.map((item) => item.trim()).filter(Boolean)
    : typeof images === "string"
      ? images.split(",").map((item) => item.trim()).filter(Boolean)
      : []

  return normalized.length > 0 ? normalized : ["/placeholder.jpg"]
}

function normalizeVariants(
  variants: ProductPayloadInput["variants"],
  isActive: boolean,
): NormalizedVariant[] {
  if (!variants || variants.length === 0) {
    return [
      {
        id: undefined,
        sku: null,
        name: "Default",
        size: null,
        color: null,
        flavor: null,
        stock: 0,
        active: isActive,
      },
    ]
  }

  return variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku ?? null,
    name: variant.name?.trim() || "Default",
    size: variant.size?.trim() || null,
    color: variant.color?.trim() || null,
    flavor: variant.flavor?.trim() || null,
    stock: asInteger(variant.stock),
    active: variant.active ?? true,
  }))
}

export function normalizeProductPayload(body: ProductPayloadInput) {
  const normalizedPrice = asNumber(body.price)
  if (normalizedPrice == null) {
    throw new Error("Preço inválido.")
  }

  const normalizedActive = body.active ?? true
  const normalizedVariants = normalizeVariants(body.variants, normalizedActive)

  return {
    productData: {
      name: body.name?.trim() || "",
      slug: body.slug?.trim() || "",
      description: body.description?.trim() || "",
      price: normalizedPrice,
      costPrice: asNumber(body.costPrice),
      images: normalizeImages(body.images),
      featured: body.featured ?? false,
      active: normalizedActive,
      isNew: body.isNew ?? true,
      weight: body.weight?.trim() || null,
      weightLabel: body.weightLabel?.trim() || body.weight?.trim() || null,
      weightKg: asNumber(body.weightKg),
      gender: body.gender?.trim() || null,
      categoryId: body.categoryId?.trim() || "",
    },
    variants: normalizedVariants,
  }
}

export function serializeCategoryTree(category: CategoryWithRelations) {
  return {
    ...category,
    parent: category.parent
      ? {
          ...category.parent,
          createdAt: category.parent.createdAt.toISOString(),
          updatedAt: category.parent.updatedAt.toISOString(),
        }
      : null,
    children: category.children.map((child) => ({
      ...child,
      createdAt: child.createdAt.toISOString(),
      updatedAt: child.updatedAt.toISOString(),
    })),
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

function serializeVariant(variant: ProductWithRelations["variants"][number]) {
  return {
    ...variant,
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
  }
}

function getPublicAvailableStock(variants: ProductWithRelations["variants"]) {
  return variants
    .filter((variant) => variant.active && variant.stock > 0)
    .reduce((sum, variant) => sum + variant.stock, 0)
}

export function serializeProduct(product: ProductWithRelations) {
  const variantStock = getPublicAvailableStock(product.variants)

  return {
    ...product,
    price: product.price.toNumber(),
    costPrice: product.costPrice?.toNumber() ?? null,
    stock: variantStock,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: {
      ...product.category,
      createdAt: product.category.createdAt.toISOString(),
      updatedAt: product.category.updatedAt.toISOString(),
      parent: product.category.parent
        ? {
            ...product.category.parent,
            createdAt: product.category.parent.createdAt.toISOString(),
            updatedAt: product.category.parent.updatedAt.toISOString(),
          }
        : null,
    },
    parentCategory: product.category.parent
      ? {
          ...product.category.parent,
          createdAt: product.category.parent.createdAt.toISOString(),
          updatedAt: product.category.parent.updatedAt.toISOString(),
        }
      : null,
    subcategory: {
      ...product.category,
      createdAt: product.category.createdAt.toISOString(),
      updatedAt: product.category.updatedAt.toISOString(),
    },
    variants: product.variants.map(serializeVariant),
  }
}
