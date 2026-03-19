import Link from "next/link"
import { ArrowRight, Instagram, MapPin, Zap } from "lucide-react"
import AddToCartButton from "@/components/AddToCartButton"
import { getBestSellingProductIds, productWithRelationsInclude, serializeProduct } from "@/lib/catalog-api"
import prisma from "@/lib/prisma"
import { getPublicStoreSettings } from "@/lib/store-settings"

const OBJECTIVE_CARD_CONTENT: Record<
  string,
  {
    image: string
    description: string
  }
> = {
  suplementos: {
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=800&auto=format&fit=crop",
    description: "Suplementos para força, recuperação e evolução consistente.",
  },
  "roupas-fitness": {
    image: "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?q=80&w=800&auto=format&fit=crop",
    description: "Peças para treino com caimento, mobilidade e presença visual.",
  },
  acessorios: {
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop",
    description: "Acessórios para complementar a rotina de treino e performance.",
  },
  "alimentacao-fitness": {
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop",
    description: "Opções práticas para rotina saudável, energia e conveniência.",
  },
}

const OBJECTIVE_CARD_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=800&auto=format&fit=crop",
]

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

    return orderedProducts.map(serializeProduct)
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

  const cards = parentCategories.map((category, index) => {
    const curatedContent = OBJECTIVE_CARD_CONTENT[category.slug]
    const childNames = category.children.map((child) => child.name).filter(Boolean)

    return {
      id: category.id,
      title: category.name,
      href: `/products?category=${category.slug}`,
      image:
        curatedContent?.image ??
        OBJECTIVE_CARD_FALLBACK_IMAGES[index % OBJECTIVE_CARD_FALLBACK_IMAGES.length],
      description:
        curatedContent?.description ??
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
    ...fallbackSubcategories.map((category, index) => ({
      id: category.id,
      title: category.name,
      href: `/products?subcategory=${category.slug}`,
      image:
        OBJECTIVE_CARD_CONTENT[category.parent?.slug ?? ""]?.image ??
        OBJECTIVE_CARD_FALLBACK_IMAGES[(cards.length + index) % OBJECTIVE_CARD_FALLBACK_IMAGES.length],
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

  return (
    <div className="flex flex-col min-h-screen">

      {/* ──── HERO ──── */}
      <section className="relative min-h-[85vh] flex items-center bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 grayscale"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop")' }}
        />
        {/* Accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)] z-20" />

        <div className="container mx-auto px-4 relative z-20 py-20">
          <div className="max-w-2xl">
            <span className="text-[var(--color-primary)] text-xs uppercase tracking-[0.3em] font-bold mb-6 block">
              ⚡ Aracoiaba · Ceará · Est. 2023
            </span>
            <h1 className="text-6xl md:text-8xl font-heading tracking-wider text-white mb-6 uppercase leading-none">
              Para quem treina{" "}
              <span className="text-[var(--color-primary)]">de verdade</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-lg leading-relaxed">
              Suplementação de alta performance e moda fitness premium. Entrega rápida para todo o Maciço de Baturité.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/products?category=suplementos"
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest py-5 px-10 rounded-sm transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20"
              >
                Ver Suplementos <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/products?category=roupas-fitness"
                className="glass hover:bg-white/10 border border-white/20 text-white font-bold uppercase tracking-widest py-5 px-10 rounded-sm transition-all text-center"
              >
                Moda Fitness
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-gray-500">
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-gray-500 animate-pulse" />
        </div>
      </section>

      {/* ──── DIFERENCIAIS ──── */}
      <section className="py-10 bg-[var(--color-primary)] border-t-0">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
            <div className="flex items-center gap-4">
              <Zap className="w-8 h-8 shrink-0 font-bold" />
              <div>
                <h3 className="font-bold uppercase tracking-widest text-sm">Entrega Rápida</h3>
                <p className="text-black/70 text-xs">Maciço de Baturité em até 24h</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <MapPin className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-bold uppercase tracking-widest text-sm">Loja Física</h3>
                <p className="text-black/70 text-xs">R. Antônio Lopes, 571 · Aracoiaba</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Instagram className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-bold uppercase tracking-widest text-sm">{storeSettings.instagram}</h3>
                <p className="text-black/70 text-xs">Siga no Instagram</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── CATEGORIAS ──── */}
      <section className="py-20 bg-background border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-5xl font-heading tracking-wider uppercase">
              Encontre seu <span className="text-[var(--color-primary)]">Objetivo</span>
            </h2>
            <div className="h-1 w-20 bg-[var(--color-primary)] mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {objectiveCategories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="group relative h-80 overflow-hidden rounded-sm bg-zinc-900 border border-white/10 hover:border-[var(--color-primary)]/50 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:scale-105 group-hover:opacity-70 transition-all duration-700"
                  style={{ backgroundImage: `url("${category.image}")` }}
                />
                <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
                  <h3 className="text-3xl font-heading tracking-wider uppercase text-white group-hover:text-[var(--color-primary)] transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    {category.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {objectiveCategories.length === 0 && (
            <div className="rounded-sm border border-dashed border-white/10 px-6 py-16 text-center text-sm text-gray-500">
              Nenhuma categoria disponível no momento.
            </div>
          )}
        </div>
      </section>

      {/* ──── PRODUTOS EM DESTAQUE ──── */}
      <section className="py-20 bg-zinc-950 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-heading tracking-wider uppercase">
                Mais <span className="text-[var(--color-secondary)]">Vendidos</span>
              </h2>
              <div className="h-1 w-20 bg-[var(--color-secondary)] mt-4" />
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

                {/* Badge topo */}
                <div className="absolute top-3 left-3 z-10">
                  {product.stock === 0 ? (
                    <span className="bg-[var(--color-secondary)] text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider rounded-sm block">
                      Esgotado
                    </span>
                  ) : product.stock < 10 ? (
                    <span className="bg-yellow-600 text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider rounded-sm block">
                      Últimas Unidades
                    </span>
                  ) : product.isNew ? (
                    <span className="bg-[var(--color-primary)] text-black text-[10px] uppercase font-bold px-2 py-1 tracking-wider rounded-sm block">
                      Novo
                    </span>
                  ) : null}
                </div>

                {/* Overlay de info na base */}
                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/60 to-transparent pt-10 px-3 pb-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white truncate leading-tight">
                      {product.name}
                    </h3>
                    <span className="text-base font-heading tracking-wider text-[var(--color-primary)]">
                      R$ {product.price.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <AddToCartButton product={product} compact />
                </div>
              </div>
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
        <div className="container mx-auto px-4">
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
