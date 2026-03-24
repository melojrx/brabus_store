import ProductsManager from "./ProductsManager"
import { Prisma } from "@prisma/client"
import { productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"

const ADMIN_PRODUCTS_PAGE_SIZE = 20

type AdminProductsSearchParams = Promise<Record<string, string | string[] | undefined>>

type AdminProductsFilters = Readonly<{
  search: string
  status: string
  parentCategory: string
  subcategory: string
  featured: string
}>

function readSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? ""
  }

  return value?.trim() ?? ""
}

function normalizeProductsPage(value: string | string[] | undefined) {
  const parsed = Number.parseInt(readSearchParam(value) || "1", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function parseAdminProductsFilters(searchParams: Record<string, string | string[] | undefined>): AdminProductsFilters {
  const status = readSearchParam(searchParams.status)
  const featured = readSearchParam(searchParams.featured)

  return {
    search: readSearchParam(searchParams.search),
    status: status === "active" || status === "inactive" ? status : "",
    parentCategory: readSearchParam(searchParams.parentCategory),
    subcategory: readSearchParam(searchParams.subcategory),
    featured: featured === "featured" || featured === "not-featured" ? featured : "",
  }
}

function buildAdminProductsWhere(filters: AdminProductsFilters): Prisma.ProductWhereInput {
  const andFilters: Prisma.ProductWhereInput[] = []

  if (filters.search) {
    andFilters.push({
      OR: [
        {
          name: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          variants: {
            some: {
              sku: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    })
  }

  if (filters.status) {
    andFilters.push({ active: filters.status === "active" })
  }

  if (filters.parentCategory) {
    andFilters.push({
      OR: [
        { category: { slug: filters.parentCategory } },
        { category: { parent: { slug: filters.parentCategory } } },
      ],
    })
  }

  if (filters.subcategory) {
    andFilters.push({
      category: { slug: filters.subcategory },
    })
  }

  if (filters.featured) {
    andFilters.push({ featured: filters.featured === "featured" })
  }

  return andFilters.length > 0 ? { AND: andFilters } : {}
}

export default async function AdminProducts({
  searchParams,
}: {
  searchParams?: AdminProductsSearchParams
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const filters = parseAdminProductsFilters(resolvedSearchParams)
  const requestedPage = normalizeProductsPage(resolvedSearchParams.page)
  const where = buildAdminProductsWhere(filters)

  const [totalItems, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { parentId: { not: null } },
      include: { parent: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_PRODUCTS_PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const rawProducts = await prisma.product.findMany({
    where,
    include: productWithRelationsInclude,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * ADMIN_PRODUCTS_PAGE_SIZE,
    take: ADMIN_PRODUCTS_PAGE_SIZE,
  })

  const products = rawProducts.map(serializeProduct)
  const serializedCategories = categories.map((category) => ({
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    parent: category.parent
      ? {
          ...category.parent,
          createdAt: category.parent.createdAt.toISOString(),
          updatedAt: category.parent.updatedAt.toISOString(),
        }
      : null,
  }))

  return (
    <ProductsManager
      initialProducts={products}
      categories={serializedCategories}
      filters={filters}
      pagination={{
        page: currentPage,
        pageSize: ADMIN_PRODUCTS_PAGE_SIZE,
        totalItems,
        totalPages,
      }}
    />
  )
}
