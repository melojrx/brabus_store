import Link from "next/link"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"
import type { CatalogSort } from "@/lib/catalog-api"
import CatalogFilters from "@/app/products/CatalogFilters"

type CatalogProduct = {
  id: string
  slug: string
  name: string
  price: number
  stock: number
  images: string[]
  category: {
    name: string
  }
}

type CatalogApiResponse = {
  items: CatalogProduct[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
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

export type CategoryTreeNode = {
  id: string
  name: string
  slug: string
  children: Array<{
    id: string
    name: string
    slug: string
  }>
}

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}

function buildProductsHref(
  currentParams: URLSearchParams,
  updates: Record<string, string | null>,
) {
  const nextParams = new URLSearchParams(currentParams.toString())

  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "") {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }
  }

  const query = nextParams.toString()
  return query ? `/products?${query}` : "/products"
}

async function getBaseUrl() {
  const headerStore = await headers()
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host")
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https")

  if (host) {
    return `${protocol}://${host}`
  }

  return process.env.NEXTAUTH_URL || "http://localhost:3000"
}

async function getCatalogData(searchParams: URLSearchParams): Promise<CatalogApiResponse> {
  const baseUrl = await getBaseUrl()
  const query = searchParams.toString()
  const url = query ? `${baseUrl}/api/products?${query}` : `${baseUrl}/api/products`
  const response = await fetch(url, { cache: "no-store" })

  if (!response.ok) {
    return {
      items: [],
      pagination: {
        page: 1,
        pageSize: 12,
        totalItems: 0,
        totalPages: 1,
      },
      filters: {
        search: "",
        sort: "recent",
        category: "",
        subcategory: "",
        size: "",
        flavor: "",
        availableSizes: [],
        availableFlavors: [],
      },
    }
  }

  return response.json()
}

async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  const categories = await prisma.category.findMany({
    where: {
      active: true,
      parentId: null,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    children: category.children,
  }))
}

export default async function Products({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const currentSearch = getSearchParamValue(resolvedSearchParams.search)
  const currentSort = getSearchParamValue(resolvedSearchParams.sort) || "recent"
  const currentCategory = getSearchParamValue(resolvedSearchParams.category)
  const currentSubcategory = getSearchParamValue(resolvedSearchParams.subcategory)
  const currentSize = getSearchParamValue(resolvedSearchParams.size)
  const currentPage = getSearchParamValue(resolvedSearchParams.page)

  const query = new URLSearchParams()
  if (currentSearch) query.set("search", currentSearch)
  if (currentSort) query.set("sort", currentSort)
  if (currentCategory) query.set("category", currentCategory)
  if (currentSubcategory) query.set("subcategory", currentSubcategory)
  if (currentSize) query.set("size", currentSize)
  if (currentPage) query.set("page", currentPage)

  const [catalog, categoryTree] = await Promise.all([
    getCatalogData(query),
    getCategoryTree(),
  ])

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <div className="mb-10 border-b border-white/10 pb-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-2">
              Todos os <span className="text-[var(--color-primary)]">Produtos</span>
            </h1>
            <p className="text-gray-400">
              Catálogo com busca, filtros por variante e navegação por categoria e subcategoria.
            </p>
          </div>

          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            {catalog.pagination.totalItems} itens encontrados
          </p>
        </div>

        <div className="mt-8 flex gap-3 overflow-x-auto pb-2">
          <Link
            href={buildProductsHref(query, {
              category: null,
              subcategory: null,
              size: null,
              flavor: null,
              page: null,
            })}
            className={`rounded-sm whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              !currentCategory
                ? "bg-[var(--color-primary)] text-black"
                : "border border-white/20 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            }`}
          >
            Todos
          </Link>

          {categoryTree.map((category) => {
            const isActive = currentCategory === category.slug

            return (
              <Link
                key={category.id}
                href={buildProductsHref(query, {
                  category: category.slug,
                  subcategory: null,
                  size: null,
                  flavor: null,
                  page: null,
                })}
                className={`rounded-sm whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-black"
                    : "border border-white/20 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                {category.name}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="space-y-8">
        <CatalogFilters
          categoryTree={categoryTree}
          currentSearch={catalog.filters.search}
          currentSort={catalog.filters.sort}
          currentCategory={currentCategory}
          currentSubcategory={currentSubcategory}
          currentSize={currentSize}
          availableSizes={catalog.filters.availableSizes}
        />

        <section className="space-y-8">

          {catalog.items.length === 0 ? (
            <div className="text-center py-20 text-gray-500 glass rounded-sm">
              Nenhum produto encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {catalog.items.map((product) => (
                <div
                  key={product.id}
                  className="group relative aspect-[3/4] rounded-sm overflow-hidden border border-white/10 hover:border-[var(--color-primary)]/50 transition-all hover:-translate-y-1 bg-zinc-900"
                >
                  <Link href={`/products/${product.slug}`} className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.images[0] || "/placeholder.jpg"}
                      alt={product.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>

                  <div className="absolute top-3 left-3 z-10">
                    {product.stock === 0 ? (
                      <span className="bg-[var(--color-secondary)] text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider rounded-sm block">
                        Esgotado
                      </span>
                    ) : product.stock < 10 ? (
                      <span className="bg-yellow-600 text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider rounded-sm block">
                        Últimas Unidades
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/60 to-transparent pt-10 px-3 pb-3">
                    <span className="text-[10px] text-gray-300 uppercase tracking-widest font-bold block truncate">
                      {product.category.name}
                    </span>
                    <h3 className="text-sm font-medium text-white truncate leading-tight">{product.name}</h3>
                    <span className="text-base font-heading tracking-wider text-[var(--color-primary)]">
                      R$ {product.price.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-6 border-t border-white/5 pt-8">
            <div className="text-center text-sm text-gray-500">
              Página {catalog.pagination.page} de {catalog.pagination.totalPages} com {catalog.pagination.pageSize} itens por página.
            </div>

            {catalog.pagination.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href={buildProductsHref(query, {
                  page: catalog.pagination.page > 1 ? String(catalog.pagination.page - 1) : "1",
                })}
                scroll={false}
                aria-disabled={catalog.pagination.page <= 1}
                className={`rounded-sm px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                  catalog.pagination.page <= 1
                    ? "pointer-events-none border border-white/5 text-gray-600"
                    : "border border-white/15 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                Anterior
              </Link>

              <div className="flex flex-wrap gap-2">
                {Array.from({ length: catalog.pagination.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <Link
                    key={pageNumber}
                    href={buildProductsHref(query, { page: String(pageNumber) })}
                    scroll={false}
                    className={`rounded-sm px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                      pageNumber === catalog.pagination.page
                        ? "bg-[var(--color-primary)] text-black"
                        : "border border-white/15 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                ))}
              </div>

              <Link
                href={buildProductsHref(query, {
                  page:
                    catalog.pagination.page < catalog.pagination.totalPages
                      ? String(catalog.pagination.page + 1)
                      : String(catalog.pagination.totalPages),
                })}
                scroll={false}
                aria-disabled={catalog.pagination.page >= catalog.pagination.totalPages}
                className={`rounded-sm px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                  catalog.pagination.page >= catalog.pagination.totalPages
                    ? "pointer-events-none border border-white/5 text-gray-600"
                    : "border border-white/15 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
                >
                  Próxima
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
