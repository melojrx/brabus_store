import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

type CategoryFlags = {
  supportsSize: boolean
  supportsColor: boolean
  supportsFlavor: boolean
  supportsWeight: boolean
  trackStockByVariant: boolean
}

type CategorySeed = {
  name: string
  slug: string
  sortOrder: number
  parentSlug?: string
  flags?: Partial<CategoryFlags>
}

type VariantSeed = {
  name?: string
  sku?: string
  size?: string
  color?: string
  flavor?: string
  stock: number
  active?: boolean
}

type ProductSeed = {
  name: string
  slug: string
  description: string
  price: number
  costPrice: number
  images: string[]
  featured?: boolean
  isNew?: boolean
  active?: boolean
  weight?: string
  weightLabel?: string
  weightKg?: number
  gender?: string
  categorySlug: string
  variants: VariantSeed[]
}

const CATEGORY_DEFAULTS: CategoryFlags = {
  supportsSize: false,
  supportsColor: false,
  supportsFlavor: false,
  supportsWeight: false,
  trackStockByVariant: false,
}

const zones = [
  { city: "Aracoiaba", price: 5.0, deadlineText: "Mesmo dia" },
  { city: "Baturite", price: 10.0, deadlineText: "Mesmo dia ou proximo dia util" },
  { city: "Capistrano", price: 10.0, deadlineText: "Mesmo dia ou proximo dia util" },
  { city: "Aratuba", price: 15.0, deadlineText: "Proximo dia util" },
  { city: "Mulungu", price: 15.0, deadlineText: "Proximo dia util" },
  { city: "Pacoti", price: 15.0, deadlineText: "Proximo dia util" },
  { city: "Guaramiranga", price: 15.0, deadlineText: "Proximo dia util" },
  { city: "Caridade", price: 15.0, deadlineText: "Proximo dia util" },
  { city: "Caninde", price: 20.0, deadlineText: "Proximo dia util" },
  { city: "Itapiuna", price: 15.0, deadlineText: "Proximo dia util" },
]

const categories: readonly CategorySeed[] = [
  { name: "Roupas Fitness", slug: "roupas-fitness", sortOrder: 10 },
  { name: "Acessorios", slug: "acessorios", sortOrder: 20 },
  { name: "Suplementos", slug: "suplementos", sortOrder: 30 },
  { name: "Alimentacao Fitness", slug: "alimentacao-fitness", sortOrder: 40 },

  {
    name: "Moda Feminina",
    slug: "moda-feminina",
    parentSlug: "roupas-fitness",
    sortOrder: 10,
    flags: { supportsSize: true, supportsColor: true, trackStockByVariant: true },
  },
  {
    name: "Camisetas",
    slug: "camisetas",
    parentSlug: "roupas-fitness",
    sortOrder: 20,
    flags: { supportsSize: true, supportsColor: true, trackStockByVariant: true },
  },
  {
    name: "Conjuntos",
    slug: "conjuntos",
    parentSlug: "roupas-fitness",
    sortOrder: 30,
    flags: { supportsSize: true, supportsColor: true, trackStockByVariant: true },
  },
  {
    name: "Tops",
    slug: "tops",
    parentSlug: "roupas-fitness",
    sortOrder: 40,
    flags: { supportsSize: true, supportsColor: true, trackStockByVariant: true },
  },
  {
    name: "Shakers",
    slug: "shakers",
    parentSlug: "acessorios",
    sortOrder: 10,
    flags: { trackStockByVariant: true },
  },
  {
    name: "Bones",
    slug: "bones",
    parentSlug: "acessorios",
    sortOrder: 20,
    flags: { trackStockByVariant: true },
  },
  {
    name: "Whey Protein",
    slug: "whey-protein",
    parentSlug: "suplementos",
    sortOrder: 10,
    flags: { supportsFlavor: true, supportsWeight: true, trackStockByVariant: true },
  },
  {
    name: "Creatina",
    slug: "creatina",
    parentSlug: "suplementos",
    sortOrder: 20,
    flags: { supportsWeight: true, trackStockByVariant: true },
  },
  {
    name: "Pre-Workout",
    slug: "pre-workout",
    parentSlug: "suplementos",
    sortOrder: 30,
    flags: { supportsFlavor: true, supportsWeight: true, trackStockByVariant: true },
  },
  {
    name: "Vitaminas",
    slug: "vitaminas",
    parentSlug: "suplementos",
    sortOrder: 40,
    flags: { supportsWeight: true, trackStockByVariant: true },
  },
  {
    name: "Bebida Proteica",
    slug: "bebida-proteica",
    parentSlug: "alimentacao-fitness",
    sortOrder: 10,
    flags: { supportsFlavor: true, supportsWeight: true, trackStockByVariant: true },
  },
  {
    name: "Sucos",
    slug: "sucos",
    parentSlug: "alimentacao-fitness",
    sortOrder: 20,
    flags: { supportsFlavor: true, supportsWeight: true, trackStockByVariant: true },
  },
]

const products: readonly ProductSeed[] = [
  {
    name: "Whey Protein Concentrado 900g",
    slug: "whey-protein-concentrado-900g",
    description: "O melhor custo-beneficio para quem busca hipertrofia.",
    price: 89.9,
    costPrice: 52.9,
    images: ["/placeholder.jpg"],
    featured: true,
    weight: "900g",
    weightLabel: "900g",
    weightKg: 0.9,
    categorySlug: "whey-protein",
    variants: [
      { name: "Chocolate", flavor: "Chocolate", stock: 18 },
      { name: "Baunilha", flavor: "Baunilha", stock: 16 },
      { name: "Morango", flavor: "Morango", stock: 16 },
    ],
  },
  {
    name: "Creatina Monohidratada 300g",
    slug: "creatina-monohidratada-300g",
    description: "Aumento de forca e explosao muscular para treinos intensos.",
    price: 49.9,
    costPrice: 27.9,
    images: ["/placeholder.jpg"],
    featured: true,
    weight: "300g",
    weightLabel: "300g",
    weightKg: 0.3,
    categorySlug: "creatina",
    variants: [{ name: "Default", stock: 100 }],
  },
  {
    name: "Pre-Workout Extremo Red Fire 300g",
    slug: "pre-workout-extremo-red-fire-300g",
    description: "Energia intensa para treinos de alta performance.",
    price: 79.9,
    costPrice: 43.5,
    images: ["/placeholder.jpg"],
    weight: "300g",
    weightLabel: "300g",
    weightKg: 0.3,
    categorySlug: "pre-workout",
    variants: [
      { name: "Frutas Vermelhas", flavor: "Frutas Vermelhas", stock: 15 },
      { name: "Limao", flavor: "Limao", stock: 15 },
    ],
  },
  {
    name: "Regata Dry Fit Masculina Brabus",
    slug: "regata-dry-fit-masculina-brabus",
    description: "Tecido respiravel e leve para treino pesado com conforto.",
    price: 59.9,
    costPrice: 28.9,
    images: ["/placeholder.jpg"],
    featured: true,
    gender: "masculino",
    weightKg: 0.1,
    categorySlug: "camisetas",
    variants: [
      { name: "Preto P", size: "P", color: "Preto", stock: 10 },
      { name: "Preto M", size: "M", color: "Preto", stock: 12 },
      { name: "Preto G", size: "G", color: "Preto", stock: 13 },
      { name: "Preto GG", size: "GG", color: "Preto", stock: 10 },
    ],
  },
  {
    name: "Legging Performance",
    slug: "legging-performance",
    description: "Legging de alta compressao com cintura alta e modelagem anatomica.",
    price: 189.9,
    costPrice: 92.0,
    images: ["/roupa_fitnes1.webp"],
    featured: true,
    isNew: true,
    gender: "feminino",
    weightKg: 0.2,
    categorySlug: "moda-feminina",
    variants: [
      { name: "Preto P", size: "P", color: "Preto", stock: 10 },
      { name: "Preto M", size: "M", color: "Preto", stock: 10 },
      { name: "Preto G", size: "G", color: "Preto", stock: 10 },
      { name: "Preto GG", size: "GG", color: "Preto", stock: 10 },
    ],
  },
  {
    name: "Top Impacto",
    slug: "top-impacto",
    description: "Top de alto impacto com sustentacao para treinos intensos.",
    price: 129.9,
    costPrice: 58.0,
    images: ["/roupa_fitnes3.png"],
    featured: true,
    isNew: true,
    gender: "feminino",
    weightKg: 0.15,
    categorySlug: "tops",
    variants: [
      { name: "Preto P", size: "P", color: "Preto", stock: 12 },
      { name: "Preto M", size: "M", color: "Preto", stock: 14 },
      { name: "Preto G", size: "G", color: "Preto", stock: 12 },
      { name: "Preto GG", size: "GG", color: "Preto", stock: 12 },
    ],
  },
  {
    name: "Conjunto Elegance",
    slug: "conjunto-elegance",
    description: "Conjunto top e legging com tecido premium e estampa exclusiva.",
    price: 299.9,
    costPrice: 148.0,
    images: ["/roupa_fitness2.png"],
    featured: true,
    isNew: true,
    gender: "feminino",
    weightKg: 0.35,
    categorySlug: "conjuntos",
    variants: [
      { name: "Preto/Rosa P", size: "P", color: "Preto/Rosa", stock: 7 },
      { name: "Preto/Rosa M", size: "M", color: "Preto/Rosa", stock: 8 },
      { name: "Preto/Rosa G", size: "G", color: "Preto/Rosa", stock: 8 },
      { name: "Preto/Rosa GG", size: "GG", color: "Preto/Rosa", stock: 7 },
    ],
  },
  {
    name: "Shaker Brabus 700ml",
    slug: "shaker-brabus-700ml",
    description: "Shaker resistente com vedacao segura para o dia a dia.",
    price: 29.9,
    costPrice: 11.5,
    images: ["/placeholder.jpg"],
    weightKg: 0.15,
    categorySlug: "shakers",
    variants: [{ name: "Default", stock: 20 }],
  },
  {
    name: "Bone Performance Classic",
    slug: "bone-performance-classic",
    description: "Bone estruturado com ajuste traseiro e visual clean.",
    price: 49.9,
    costPrice: 21.0,
    images: ["/placeholder.jpg"],
    featured: true,
    weightKg: 0.12,
    categorySlug: "bones",
    variants: [{ name: "Default", stock: 18 }],
  },
  {
    name: "Bebida Proteica Chocolate 250ml",
    slug: "bebida-proteica-chocolate-250ml",
    description: "Bebida pronta com alto teor proteico e sabor equilibrado.",
    price: 12.9,
    costPrice: 6.2,
    images: ["/placeholder.jpg"],
    featured: true,
    weight: "250ml",
    weightLabel: "250ml",
    weightKg: 0.25,
    categorySlug: "bebida-proteica",
    variants: [{ name: "Chocolate", flavor: "Chocolate", stock: 60 }],
  },
  {
    name: "Suco Verde Funcional 300ml",
    slug: "suco-verde-funcional-300ml",
    description: "Suco funcional pronto para consumo com perfil refrescante.",
    price: 10.9,
    costPrice: 4.8,
    images: ["/placeholder.jpg"],
    weight: "300ml",
    weightLabel: "300ml",
    weightKg: 0.3,
    categorySlug: "sucos",
    variants: [{ name: "Limao com Hortela", flavor: "Limao com Hortela", stock: 55 }],
  },
]

async function createCategories() {
  const categoriesBySlug = new Map<string, { id: string }>()

  for (const category of categories.filter((item) => !item.parentSlug)) {
    const created = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        ...CATEGORY_DEFAULTS,
      },
      select: { id: true },
    })

    categoriesBySlug.set(category.slug, created)
  }

  for (const category of categories.filter((item) => item.parentSlug)) {
    const parent = categoriesBySlug.get(category.parentSlug!)
    if (!parent) {
      throw new Error(`Parent category not found for slug ${category.parentSlug}`)
    }

    const created = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        parentId: parent.id,
        sortOrder: category.sortOrder,
        ...CATEGORY_DEFAULTS,
        ...category.flags,
      },
      select: { id: true },
    })

    categoriesBySlug.set(category.slug, created)
  }

  return categoriesBySlug
}

async function createProductWithVariants(categoryId: string, product: ProductSeed) {
  await prisma.product.create({
    data: {
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      costPrice: product.costPrice,
      images: product.images,
      featured: product.featured ?? false,
      active: product.active ?? true,
      isNew: product.isNew ?? true,
      weight: product.weight ?? null,
      weightLabel: product.weightLabel ?? product.weight ?? null,
      weightKg: product.weightKg ?? null,
      gender: product.gender ?? null,
      categoryId,
      variants: {
        create: product.variants.map((variant, index) => ({
          sku: variant.sku ?? `${product.slug}-${index + 1}`,
          name: variant.name ?? "Default",
          size: variant.size ?? null,
          color: variant.color ?? null,
          flavor: variant.flavor ?? null,
          stock: variant.stock,
          active: variant.active ?? true,
        })),
      },
    },
  })
}

async function main() {
  console.log("Starting seed...")

  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.localDeliveryZone.deleteMany()
  await prisma.storeSettings.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash("Admin@123", 10)
  const admin = await prisma.user.create({
    data: {
      name: "Admin Brabus",
      email: "admin@brabus.com",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })
  console.log(`Admin created: ${admin.email}`)

  await prisma.storeSettings.create({
    data: {
      addressStreet: "Rua Antonio Lopes, 571",
      addressComplement: "Conjunto Cohab",
      addressCity: "Aracoiaba",
      addressState: "CE",
      addressZip: "62765-000",
      whatsapp: "5585997839040",
      instagram: "@brabus.performancestore",
      openingHours: "Seg-Sex: 8h-18h | Sab: 8h-13h",
    },
  })

  for (const zone of zones) {
    await prisma.localDeliveryZone.create({ data: zone })
  }

  const categoriesBySlug = await createCategories()
  console.log(`Categories created: ${categoriesBySlug.size}`)

  for (const product of products) {
    const category = categoriesBySlug.get(product.categorySlug)
    if (!category) {
      throw new Error(`Category not found for slug ${product.categorySlug}`)
    }

    await createProductWithVariants(category.id, product)
  }

  const productCount = await prisma.product.count()
  const variantCount = await prisma.productVariant.count()

  console.log(`Products created: ${productCount}`)
  console.log(`Variants created: ${variantCount}`)
  console.log("Seed finished.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
