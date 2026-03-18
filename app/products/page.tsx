import Link from "next/link"

const PRODUCT_FILTERS = [
  { label: "Todos", href: "/products", value: "" },
  { label: "Suplementos", href: "/products?category=suplementos", value: "suplementos" },
  { label: "Moda Fitness", href: "/products?category=roupas-fitness", value: "roupas-fitness" },
  { label: "Acessórios", href: "/products?category=acessorios", value: "acessorios" },
] as const

async function getProducts(searchParams: URLSearchParams) {
  try {
    const query = searchParams.toString()
    const baseUrl = process.env.NEXTAUTH_URL
    const url = query ? `${baseUrl}/api/products?${query}` : `${baseUrl}/api/products`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function Products({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const currentCategory = Array.isArray(resolvedSearchParams.category)
    ? resolvedSearchParams.category[0] ?? ""
    : resolvedSearchParams.category ?? ""

  const currentSubcategory = Array.isArray(resolvedSearchParams.subcategory)
    ? resolvedSearchParams.subcategory[0] ?? ""
    : resolvedSearchParams.subcategory ?? ""

  const query = new URLSearchParams()
  if (currentCategory) {
    query.set("category", currentCategory)
  }
  if (currentSubcategory) {
    query.set("subcategory", currentSubcategory)
  }

  const products = await getProducts(query)

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <div className="flex flex-col md:flex-row items-baseline justify-between mb-12 border-b border-white/10 pb-8 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-2">
            Todos os <span className="text-[var(--color-primary)]">Produtos</span>
          </h1>
          <p className="text-gray-400">Equipamento pesado e suplementação de ponta.</p>
        </div>

        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {PRODUCT_FILTERS.map((filter) => {
            const isActive = currentCategory === filter.value || (!currentCategory && filter.value === "")

            return (
              <Link
                key={filter.href}
                href={filter.href}
                className={`rounded-sm whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-black"
                    : "border border-white/20 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                {filter.label}
              </Link>
            )
          })}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-500 glass rounded-sm">
          Nenhum produto cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product: any) => (
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
                  R$ {parseFloat(product.price).toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
