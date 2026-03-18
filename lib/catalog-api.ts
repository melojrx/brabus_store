import { OrderStatus, Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

export const CATALOG_PAGE_SIZE = 8
export const CATALOG_SORT_VALUES = ["recent", "price-asc", "price-desc", "best-selling"] as const
export type CatalogSort = (typeof CATALOG_SORT_VALUES)[number]

const SALES_RELEVANT_ORDER_STATUSES = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] as const

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

type CatalogPagination = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

type CatalogResponse = {
  items: ReturnType<typeof serializeProduct>[]
  pagination: CatalogPagination
  filters: {
    search: string
    sort: CatalogSort
    category: string
    subcategory: string
    size: string
    flavor: string
    availableSizes: string[]
    availableFlavors: string[]
  }
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

function normalizeCatalogQueryValue(value: string | null) {
  return value?.trim() ?? ""
}

function normalizeCatalogFacetValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function parseCatalogPage(searchParams: URLSearchParams) {
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export function parseCatalogSort(searchParams: URLSearchParams): CatalogSort {
  const sort = searchParams.get("sort")
  return CATALOG_SORT_VALUES.includes(sort as CatalogSort) ? (sort as CatalogSort) : "recent"
}

export function buildCatalogProductWhere(searchParams: URLSearchParams): Prisma.ProductWhereInput {
  const category = normalizeCatalogQueryValue(searchParams.get("category"))
  const subcategory = normalizeCatalogQueryValue(searchParams.get("subcategory"))
  const type = normalizeCatalogQueryValue(searchParams.get("type"))
  const search = normalizeCatalogQueryValue(searchParams.get("search"))
  const size = normalizeCatalogQueryValue(searchParams.get("size"))
  const flavor = normalizeCatalogQueryValue(searchParams.get("flavor"))

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

  if (search) {
    andFilters.push({
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    })
  }

  if (size) {
    andFilters.push({
      variants: {
        some: {
          active: true,
          size,
        },
      },
    })
  }

  if (flavor) {
    andFilters.push({
      variants: {
        some: {
          active: true,
          flavor,
        },
      },
    })
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

async function getAvailableCatalogFacetValues(where: Prisma.ProductWhereInput) {
  const [sizes, flavors] = await Promise.all([
    prisma.productVariant.findMany({
      where: {
        active: true,
        size: { not: null },
        product: { is: where },
      },
      select: { size: true },
      distinct: ["size"],
      orderBy: { size: "asc" },
    }),
    prisma.productVariant.findMany({
      where: {
        active: true,
        flavor: { not: null },
        product: { is: where },
      },
      select: { flavor: true },
      distinct: ["flavor"],
      orderBy: { flavor: "asc" },
    }),
  ])

  return {
    availableSizes: sizes
      .map((item) => normalizeCatalogFacetValue(item.size))
      .filter((value): value is string => value !== null),
    availableFlavors: flavors
      .map((item) => normalizeCatalogFacetValue(item.flavor))
      .filter((value): value is string => value !== null),
  }
}

export async function getBestSellingProductIds(where: Prisma.ProductWhereInput) {
  const filteredProducts = await prisma.product.findMany({
    where,
    select: {
      id: true,
      featured: true,
      createdAt: true,
    },
  })

  if (filteredProducts.length === 0) {
    return []
  }

  const quantities = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: {
        in: filteredProducts.map((product) => product.id),
      },
      order: {
        status: {
          in: [...SALES_RELEVANT_ORDER_STATUSES],
        },
      },
    },
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
  })

  const salesByProductId = new Map(
    quantities.map((entry) => [entry.productId, entry._sum.quantity ?? 0]),
  )

  return filteredProducts
    .toSorted((left, right) => {
      const salesDiff = (salesByProductId.get(right.id) ?? 0) - (salesByProductId.get(left.id) ?? 0)
      if (salesDiff !== 0) {
        return salesDiff
      }

      const featuredDiff = Number(right.featured) - Number(left.featured)
      if (featuredDiff !== 0) {
        return featuredDiff
      }

      return right.createdAt.getTime() - left.createdAt.getTime()
    })
    .map((product) => product.id)
}

function orderProductsByIds(products: ProductWithRelations[], orderedIds: readonly string[]) {
  const productsById = new Map(products.map((product) => [product.id, product]))
  return orderedIds
    .map((id) => productsById.get(id))
    .filter((product): product is ProductWithRelations => product != null)
}

export async function getCatalogProducts(searchParams: URLSearchParams): Promise<CatalogResponse> {
  const where = buildCatalogProductWhere(searchParams)
  const page = parseCatalogPage(searchParams)
  const sort = parseCatalogSort(searchParams)
  const search = normalizeCatalogQueryValue(searchParams.get("search"))
  const category = normalizeCatalogQueryValue(searchParams.get("category"))
  const subcategory = normalizeCatalogQueryValue(searchParams.get("subcategory"))
  const size = normalizeCatalogQueryValue(searchParams.get("size"))
  const flavor = normalizeCatalogQueryValue(searchParams.get("flavor"))

  const [totalItems, facets] = await Promise.all([
    prisma.product.count({ where }),
    getAvailableCatalogFacetValues(where),
  ])

  const totalPages = Math.max(1, Math.ceil(totalItems / CATALOG_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const skip = (currentPage - 1) * CATALOG_PAGE_SIZE

  let products: ProductWithRelations[] = []

  if (sort === "best-selling") {
    const orderedIds = await getBestSellingProductIds(where)
    const pageIds = orderedIds.slice(skip, skip + CATALOG_PAGE_SIZE)

    if (pageIds.length > 0) {
      const pageProducts = await prisma.product.findMany({
        where: {
          id: {
            in: pageIds,
          },
        },
        include: productWithRelationsInclude,
      })

      products = orderProductsByIds(pageProducts, pageIds)
    }
  } else {
    const orderBy =
      sort === "price-asc"
        ? ({ price: "asc" } satisfies Prisma.ProductOrderByWithRelationInput)
        : sort === "price-desc"
          ? ({ price: "desc" } satisfies Prisma.ProductOrderByWithRelationInput)
          : ({ createdAt: "desc" } satisfies Prisma.ProductOrderByWithRelationInput)

    products = await prisma.product.findMany({
      where,
      include: productWithRelationsInclude,
      orderBy,
      skip,
      take: CATALOG_PAGE_SIZE,
    })
  }

  return {
    items: products.map(serializeProduct),
    pagination: {
      page: currentPage,
      pageSize: CATALOG_PAGE_SIZE,
      totalItems,
      totalPages,
    },
    filters: {
      search,
      sort,
      category,
      subcategory,
      size,
      flavor,
      availableSizes: facets.availableSizes,
      availableFlavors: facets.availableFlavors,
    },
  }
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
