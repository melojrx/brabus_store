import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const STORE_TIMEZONE = "America/Fortaleza"

const SUPPLEMENT_CATEGORY_SLUGS = [
  "whey-protein",
  "creatina",
  "pre-workout",
  "vitaminas",
  "bebida-proteica",
  "sucos",
]

type DemoVariant = {
  name: string
  flavor?: string
  stock: number
  expiresAt: Date | null
}

type DemoProduct = {
  name: string
  slug: string
  description: string
  categorySlug: string
  price: number
  costPrice: number
  variants: DemoVariant[]
}

function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function startOfTodayInStoreTimezone() {
  const dateKey = getDateKey()
  return new Date(`${dateKey}T12:00:00.000Z`)
}

function addDays(days: number) {
  const base = startOfTodayInStoreTimezone()
  base.setUTCDate(base.getUTCDate() + days)
  return base
}

const demoProducts: DemoProduct[] = [
  {
    name: "[DEMO] Whey Protein Vencido",
    slug: "demo-whey-vencido",
    description: "Produto de demonstração com validade já vencida.",
    categorySlug: "whey-protein",
    price: 79.9,
    costPrice: 45,
    variants: [
      { name: "Chocolate", flavor: "Chocolate", stock: 8, expiresAt: addDays(-12) },
      { name: "Baunilha", flavor: "Baunilha", stock: 5, expiresAt: addDays(-3) },
    ],
  },
  {
    name: "[DEMO] Creatina Vence em Breve",
    slug: "demo-creatina-critica",
    description: "Produto de demonstração no alerta crítico (≤ 7 dias).",
    categorySlug: "creatina",
    price: 49.9,
    costPrice: 28,
    variants: [{ name: "300g", stock: 14, expiresAt: addDays(4) }],
  },
  {
    name: "[DEMO] Pre-Workout Próximo do Vencimento",
    slug: "demo-pre-workout-alerta",
    description: "Produto de demonstração no alerta amarelo (≤ 30 dias).",
    categorySlug: "pre-workout",
    price: 69.9,
    costPrice: 38,
    variants: [
      { name: "Frutas Vermelhas", flavor: "Frutas Vermelhas", stock: 9, expiresAt: addDays(18) },
      { name: "Limão", flavor: "Limão", stock: 6, expiresAt: addDays(25) },
    ],
  },
  {
    name: "[DEMO] Multivitamínico OK",
    slug: "demo-vitamina-ok",
    description: "Produto de demonstração fora dos alertas de validade.",
    categorySlug: "vitaminas",
    price: 39.9,
    costPrice: 22,
    variants: [{ name: "120 cápsulas", stock: 22, expiresAt: addDays(120) }],
  },
  {
    name: "[DEMO] BCAA Sem Validade Cadastrada",
    slug: "demo-bcaa-sem-validade",
    description: "Produto de demonstração com estoque, mas sem data de validade informada.",
    categorySlug: "pre-workout",
    price: 59.9,
    costPrice: 31,
    variants: [{ name: "Tropical", flavor: "Tropical", stock: 11, expiresAt: null }],
  },
  {
    name: "[DEMO] Bebida Proteica Mix de Alertas",
    slug: "demo-bebida-mix-alertas",
    description: "Um produto com variantes em níveis diferentes de alerta.",
    categorySlug: "bebida-proteica",
    price: 12.9,
    costPrice: 6.5,
    variants: [
      { name: "Chocolate", flavor: "Chocolate", stock: 7, expiresAt: addDays(-1) },
      { name: "Morango", flavor: "Morango", stock: 10, expiresAt: addDays(6) },
      { name: "Uva", flavor: "Uva", stock: 15, expiresAt: addDays(28) },
    ],
  },
]

async function enableTrackExpiration() {
  const result = await prisma.category.updateMany({
    where: { slug: { in: SUPPLEMENT_CATEGORY_SLUGS } },
    data: { trackExpiration: true },
  })

  console.log(`trackExpiration habilitado em ${result.count} subcategoria(s).`)
}

async function upsertDemoProduct(categoryId: string, product: DemoProduct) {
  const existing = await prisma.product.findUnique({
    where: { slug: product.slug },
    select: { id: true },
  })

  if (existing) {
    await prisma.productVariant.deleteMany({ where: { productId: existing.id } })
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: product.name,
        description: product.description,
        price: product.price,
        costPrice: product.costPrice,
        active: true,
        categoryId,
        variants: {
          create: product.variants.map((variant, index) => ({
            sku: `${product.slug}-${index + 1}`,
            name: variant.name,
            flavor: variant.flavor ?? null,
            stock: variant.stock,
            expiresAt: variant.expiresAt,
            active: true,
          })),
        },
      },
    })

    console.log(`Atualizado: ${product.slug}`)
    return
  }

  await prisma.product.create({
    data: {
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      costPrice: product.costPrice,
      images: ["/placeholder.jpg"],
      featured: false,
      active: true,
      isNew: false,
      categoryId,
      variants: {
        create: product.variants.map((variant, index) => ({
          sku: `${product.slug}-${index + 1}`,
          name: variant.name,
          flavor: variant.flavor ?? null,
          stock: variant.stock,
          expiresAt: variant.expiresAt,
          active: true,
        })),
      },
    },
  })

  console.log(`Criado: ${product.slug}`)
}

async function patchExistingSupplements() {
  const patches = [
    {
      productSlug: "whey-protein-concentrado-900g",
      variants: [
        { flavor: "Chocolate", expiresAt: addDays(5) },
        { flavor: "Baunilha", expiresAt: addDays(22) },
        { flavor: "Morango", expiresAt: addDays(-8) },
      ],
    },
    {
      productSlug: "creatina-monohidratada-300g",
      variants: [{ name: "Default", expiresAt: addDays(3) }],
    },
  ]

  for (const patch of patches) {
    const product = await prisma.product.findUnique({
      where: { slug: patch.productSlug },
      select: {
        id: true,
        variants: { select: { id: true, name: true, flavor: true } },
      },
    })

    if (!product) {
      console.log(`Produto base não encontrado: ${patch.productSlug}`)
      continue
    }

    for (const variantPatch of patch.variants) {
      const variant = product.variants.find((item) => {
        if ("flavor" in variantPatch && variantPatch.flavor) {
          return item.flavor === variantPatch.flavor
        }

        return "name" in variantPatch && item.name === variantPatch.name
      })

      if (!variant) {
        continue
      }

      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { expiresAt: variantPatch.expiresAt },
      })
    }

    console.log(`Validades aplicadas em: ${patch.productSlug}`)
  }
}

async function printSummary() {
  const { findExpiringVariants } = await import("@/lib/expiry-alerts")
  const items = await findExpiringVariants()

  console.log("\n--- Resumo de alertas ---")
  console.log(`Total em alerta: ${items.length}`)

  for (const item of items) {
    console.log(
      `[${item.level.toUpperCase()}] ${item.productName} (${item.variantLabel}) — ${item.daysLeft}d — estoque ${item.stock}`,
    )
  }
}

async function main() {
  console.log("Seed de demonstração de validade...\n")

  await enableTrackExpiration()
  await patchExistingSupplements()

  for (const product of demoProducts) {
    const category = await prisma.category.findUnique({
      where: { slug: product.categorySlug },
      select: { id: true },
    })

    if (!category) {
      console.log(`Subcategoria não encontrada: ${product.categorySlug}`)
      continue
    }

    await upsertDemoProduct(category.id, product)
  }

  await printSummary()
  console.log("\nConcluído. Verifique /admin, /admin/pdv e a aba Estoque do dashboard.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
