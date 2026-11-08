import Link from "next/link"
import { ArrowRight, Instagram } from "lucide-react"
import AddToCartButton from "@/components/AddToCartButton"
import ObjectiveCategories from "@/components/storefront/ObjectiveCategories"
import ProductCard from "@/components/storefront/ProductCard"
import StorefrontHero from "@/components/storefront/StorefrontHero"
import StorefrontInfoStrip from "@/components/storefront/StorefrontInfoStrip"
import { getBestSellingProductIds, productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"
import { getPublicStoreSettings } from "@/lib/store-settings"
import { isOnlineSalesEnabled } from "@/lib/online-sales"

async function getBestSellingProducts() {
  try {
    const activeWhere = { active: true }
    const orderedIds = await getBestSellingProductIds(activeWhere)
    const topIds = orderedIds.slice(0, 8)

    let products = topIds.length
      ? await prisma.product.findMany({
          where: {
            id: {
              in: topIds,
            },
          },
          include: productWithRelationsInclude,
        })
      : []

    if (products.length === 0) {
      products = await prisma.product.findMany({
        where: { active: true, featured: true },
        include: productWithRelationsInclude,
        take: 8,
        orderBy: { createdAt: "desc" },
      })
    }

    if (products.length === 0) {
      products = await prisma.product.findMany({
        where: { active: true },
        include: productWithRelationsInclude,
        take: 8,
        orderBy: { createdAt: "desc" },
      })
    }

    const productsById = new Map(products.map((product) => [product.id, product]))
    const orderedProducts =
      topIds.length > 0
        ? topIds.map((id) => productsById.get(id)).filter((product) => product != null)
        : products

    return orderedProducts.map(product => serializeProduct(product))
  } catch {
    return []
  }
}

async function getObjectiveCategories() {
  const parentCategories = await prisma.category.findMany({
    where: {
      active: true,
      parentId: null,
      OR: [
        {
          products: {
            some: {
              active: true,
            },
          },
        },
        {
          children: {
            some: {
              active: true,
              products: {
                some: {
                  active: true,
                },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 3,
    select: {
      id: true,
      name: true,
      slug: true,
      children: {
        where: {
          active: true,
          products: {
            some: {
              active: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  const cards = parentCategories.map((category) => {
    const childNames = category.children.map((child) => child.name).filter(Boolean)

    return {
      id: category.id,
      slug: category.slug,
      title: category.name,
      href: `/products?category=${category.slug}`,
      description:
        (childNames.length > 0
          ? `Explore ${childNames.join(", ").toLowerCase()} e outras opções da categoria.`
          : "Veja os produtos disponíveis desta categoria no catálogo."),
    }
  })

  if (cards.length >= 3) {
    return cards
  }

  const fallbackSubcategories = await prisma.category.findMany({
    where: {
      active: true,
      parentId: {
        not: null,
      },
      products: {
        some: {
          active: true,
        },
      },
      slug: {
        notIn: cards.map((card) => card.href.split("=").at(-1) ?? ""),
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 3 - cards.length,
    select: {
      id: true,
      name: true,
      slug: true,
      parent: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  })

  return [
    ...cards,
    ...fallbackSubcategories.map((category) => ({
      id: category.id,
      slug: category.slug,
      title: category.name,
      href: `/products?subcategory=${category.slug}`,
      description: category.parent
        ? `Veja os produtos de ${category.name.toLowerCase()} dentro de ${category.parent.name.toLowerCase()}.`
        : "Veja os produtos disponíveis desta categoria no catálogo.",
    })),
  ]
}

export default async function Home() {
  const [bestSellingProducts, objectiveCategories, storeSettings] = await Promise.all([
    getBestSellingProducts(),
    getObjectiveCategories(),
    getPublicStoreSettings(),
  ])
  const onlineSalesEnabled = isOnlineSalesEnabled()

  return (
    <div className="flex flex-col min-h-screen">

      <StorefrontHero />
      <StorefrontInfoStrip
        address={`${storeSettings.addressStreet} · ${storeSettings.addressCity}`}
        instagram={storeSettings.instagram}
        instagramUrl={storeSettings.instagramUrl}
      />

      <ObjectiveCategories categories={objectiveCategories} />

      {/* ──── PRODUTOS EM DESTAQUE ──── */}
      <section className="py-20 bg-zinc-950 border-t border-white/5">
        <div className="storefront-container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-heading tracking-wider uppercase">
                Mais <span className="text-[var(--color-primary)]">Vendidos</span>
              </h2>
              <div className="h-1 w-20 bg-[var(--color-primary)] mt-4" />
            </div>
            <Link
              href="/products"
              className="hidden md:flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-widest font-bold"
            >
              Ver Todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {bestSellingProducts.map((product) => (
              <ProductCard key={product.id} product={product} action={
                <AddToCartButton product={product} compact onlineSalesEnabled={onlineSalesEnabled} whatsapp={storeSettings.whatsapp} />
              } />
            ))}

            {bestSellingProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 border border-white/10 border-dashed rounded-sm">
                Nenhum produto disponível no momento.
              </div>
            )}
          </div>

          <div className="mt-10 md:hidden flex justify-center">
            <Link
              href="/products"
              className="flex items-center gap-2 text-sm text-white hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest font-bold border border-white/20 px-8 py-4 rounded-sm hover:border-[var(--color-primary)]/50"
            >
              Ver Todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ──── INSTAGRAM ──── */}
      <section className="py-20 bg-black border-t border-white/5">
        <div className="storefront-container">
          <div className="text-center max-w-2xl mx-auto">
            <Instagram className="w-10 h-10 mx-auto text-[var(--color-primary)] mb-4" />
            <h2 className="text-3xl md:text-4xl font-heading tracking-wider uppercase mb-2">
              Siga a <span className="text-white">{storeSettings.instagram}</span>
            </h2>
            <p className="text-gray-400 mt-2">
              Acompanhe novidades da loja, lançamentos e bastidores no perfil oficial.
            </p>

            <div className="mt-8">
              <a
                href={storeSettings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:underline font-bold uppercase tracking-widest text-sm"
              >
                <Instagram className="w-5 h-5" /> Ver perfil no Instagram
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
