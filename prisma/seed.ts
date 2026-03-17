import { PrismaClient, Role, ProductType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando o seed...')
  
  // Limpar banco
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.localDeliveryZone.deleteMany()
  await prisma.storeSettings.deleteMany()
  await prisma.user.deleteMany()
  
  // 1. Criar admin
  const hashedPassword = await bcrypt.hash('Admin@123', 10)
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Brabus',
      email: 'admin@brabus.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })
  console.log('✅ Admin criado:', admin.email)

  // 2. Configurações da loja
  await prisma.storeSettings.create({
    data: {
      addressStreet: 'Rua Antônio Lopes, 571',
      addressComplement: 'Conjunto Cohab',
      addressCity: 'Aracoiaba',
      addressState: 'CE',
      addressZip: '62765-000',
      whatsapp: '5585997839040',
      instagram: '@brabus.performancestore',
      openingHours: 'Seg–Sex: 8h–18h | Sáb: 8h–13h',
    },
  })
  console.log('✅ Store Settings configurados')

  // 3. Zonas de Entrega
  const zones = [
    { city: 'Aracoiaba', price: 5.00, deadlineText: 'Mesmo dia' },
    { city: 'Baturité', price: 10.00, deadlineText: 'Mesmo dia ou próximo dia útil' },
    { city: 'Capistrano', price: 10.00, deadlineText: 'Mesmo dia ou próximo dia útil' },
    { city: 'Aratuba', price: 15.00, deadlineText: 'Próximo dia útil' },
    { city: 'Mulungu', price: 15.00, deadlineText: 'Próximo dia útil' },
    { city: 'Pacoti', price: 15.00, deadlineText: 'Próximo dia útil' },
    { city: 'Guaramiranga', price: 15.00, deadlineText: 'Próximo dia útil' },
    { city: 'Caridade', price: 15.00, deadlineText: 'Próximo dia útil' },
    { city: 'Canindé', price: 20.00, deadlineText: 'Próximo dia útil' },
    { city: 'Itapiúna', price: 15.00, deadlineText: 'Próximo dia útil' },
  ]
  
  for (const zone of zones) {
    await prisma.localDeliveryZone.create({ data: zone })
  }
  console.log(`✅ Zonas de entrega configuradas (${zones.length} cidades)`)

  // 4. Categorias
  const catWhey = await prisma.category.create({ data: { name: 'Whey Protein', slug: 'whey-protein' } })
  const catCreatina = await prisma.category.create({ data: { name: 'Creatina', slug: 'creatina' } })
  const catPreWorkout = await prisma.category.create({ data: { name: 'Pré-Workout', slug: 'pre-workout' } })
  await prisma.category.create({ data: { name: 'BCAA', slug: 'bcaa' } })
  await prisma.category.create({ data: { name: 'Vitaminas', slug: 'vitaminas' } })
  
  const catCamisetas = await prisma.category.create({ data: { name: 'Camisetas', slug: 'camisetas' } })
  await prisma.category.create({ data: { name: 'Kits', slug: 'kits' } })
  const catAcessorios = await prisma.category.create({ data: { name: 'Acessórios', slug: 'acessorios' } })
  
  console.log('✅ Categorias criadas')

  // 5. Produtos
  await prisma.product.create({
    data: {
      name: 'Whey Protein Concentrado 900g',
      slug: 'whey-protein-concentrado-900g',
      description: 'O melhor cust-benefício para quem busca hipertrofia.',
      price: 89.90,
      stock: 50,
      images: ['/placeholder.jpg'],
      featured: true,
      productType: ProductType.SUPPLEMENT,
      weight: '900g',
      weightKg: 0.9,
      flavors: ['Chocolate', 'Baunilha', 'Morango'],
      categoryId: catWhey.id,
    }
  })

  await prisma.product.create({
    data: {
      name: 'Creatina Monohidratada 300g',
      slug: 'creatina-monohidratada-300g',
      description: 'Aumento de força e explosão muscular no seu treino.',
      price: 49.90,
      stock: 100,
      images: ['/placeholder.jpg'],
      featured: true,
      productType: ProductType.SUPPLEMENT,
      weight: '300g',
      weightKg: 0.3,
      categoryId: catCreatina.id,
    }
  })

  await prisma.product.create({
    data: {
      name: 'Pré-Workout Extremo Red Fire 300g',
      slug: 'pre-workout-extremo-red-fire-300g',
      description: 'Energia extrema para treinos intensos.',
      price: 79.90,
      stock: 30,
      images: ['/placeholder.jpg'],
      featured: false,
      productType: ProductType.SUPPLEMENT,
      weight: '300g',
      weightKg: 0.3,
      flavors: ['Frutas Vermelhas', 'Limão'],
      categoryId: catPreWorkout.id,
    }
  })

  await prisma.product.create({
    data: {
      name: 'Regata Dry Fit Masculina Brabu\'s',
      slug: 'regata-dry-fit-masculina-brabus',
      description: 'Tecido respirável e leve, ideal para aquele treino pesado.',
      price: 59.90,
      stock: 45,
      images: ['/placeholder.jpg'],
      featured: true,
      productType: ProductType.FASHION,
      sizes: ['P', 'M', 'G', 'GG'],
      gender: 'masculino',
      color: 'Preto',
      weightKg: 0.1,
      categoryId: catCamisetas.id,
    }
  })

  await prisma.product.create({
    data: {
      name: 'Shaker Brabu\'s 700ml',
      slug: 'shaker-brabus-700ml',
      description: 'Misture seu whey com estilo. Não vaza.',
      price: 29.90,
      stock: 20,
      images: ['/placeholder.jpg'],
      featured: false,
      productType: ProductType.ACCESSORY,
      weightKg: 0.15,
      categoryId: catAcessorios.id,
    }
  })

  console.log('✅ Produtos inseridos no banco!')
  console.log('🪴 Seed finalizado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
