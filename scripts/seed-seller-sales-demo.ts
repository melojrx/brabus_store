import { OrderChannel, PrismaClient, ShippingType } from "@prisma/client"
import { createManualOrder } from "@/lib/manual-orders"

const prisma = new PrismaClient()
const DEMO_TAG = "[DEMO] Relatório de vendas por vendedor v1"

const demoSellers = [
  { key: "ana", name: "[DEMO] Ana Vendedora", email: "vendas.demo.ana@brabus.local", phone: "85999001001" },
  { key: "bruno", name: "[DEMO] Bruno Vendedor", email: "vendas.demo.bruno@brabus.local", phone: "85999001002" },
  { key: "carla", name: "[DEMO] Carla Vendedora", email: "vendas.demo.carla@brabus.local", phone: "85999001003" },
] as const

const demoSales = [
  { sellerKey: "ana", variantIndex: 0, quantity: 2, paymentMethod: "MANUAL_PIX", paymentStatus: "PAID" },
  { sellerKey: "ana", variantIndex: 1, quantity: 1, paymentMethod: "MANUAL_PIX", paymentStatus: "PAID" },
  { sellerKey: "ana", variantIndex: 2, quantity: 1, paymentMethod: "MANUAL_PIX", paymentStatus: "PAID" },
  { sellerKey: "bruno", variantIndex: 0, quantity: 1, paymentMethod: "POS_DEBIT", paymentStatus: "PAID" },
  { sellerKey: "bruno", variantIndex: 1, quantity: 2, paymentMethod: "POS_DEBIT", paymentStatus: "PAID" },
  { sellerKey: "carla", variantIndex: 0, quantity: 1, paymentMethod: "FIADO", paymentStatus: "PENDING" },
] as const

async function main() {
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: "admin@brabus.com" } })
  const variants = await prisma.productVariant.findMany({
    where: { active: true, stock: { gt: 10 }, product: { active: true } },
    orderBy: { stock: "desc" },
    take: 3,
    select: { id: true, productId: true, product: { select: { name: true } } },
  })

  if (variants.length < 3) {
    throw new Error("São necessárias pelo menos três variantes ativas com estoque acima de 10 para criar a demonstração.")
  }

  const sellers = new Map<string, { id: string; name: string }>()
  for (const demoSeller of demoSellers) {
    const { key, ...sellerData } = demoSeller
    const seller = await prisma.seller.findFirst({ where: { email: demoSeller.email } })
      ?? await prisma.seller.create({ data: { ...sellerData, active: true } })
    sellers.set(key, seller)
  }

  const fiadoCustomer = await prisma.customer.findFirst({ where: { email: "vendas.demo.carla.cliente@brabus.local" } })
    ?? await prisma.customer.create({
      data: { name: "[DEMO] Cliente Fiado da Carla", phone: "85999002001", email: "vendas.demo.carla.cliente@brabus.local" },
    })

  let created = 0
  for (const [index, sale] of demoSales.entries()) {
    const note = `${DEMO_TAG} #${index + 1}`
    const existing = await prisma.order.findFirst({ where: { manualPaymentNotes: note } })
    if (existing) {
      continue
    }

    const seller = sellers.get(sale.sellerKey)
    const variant = variants[sale.variantIndex]
    if (!seller || !variant) {
      throw new Error("Não foi possível montar a venda sintética.")
    }

    await createManualOrder(prisma, {
      userId: null,
      customerId: sale.paymentMethod === "FIADO" ? fiadoCustomer.id : null,
      actorUserId: actor.id,
      channel: OrderChannel.PDV,
      sellerId: seller.id,
      customerNameSnapshot: sale.paymentMethod === "FIADO" ? fiadoCustomer.name : `[DEMO] Cliente de ${seller.name}`,
      customerPhoneSnapshot: sale.paymentMethod === "FIADO" ? fiadoCustomer.phone : null,
      items: [{ productId: variant.productId, productVariantId: variant.id, quantity: sale.quantity }],
      shippingType: ShippingType.PICKUP,
      address: {},
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      manualPaymentReference: `${DEMO_TAG}-${index + 1}`,
      manualPaymentNotes: note,
    })
    created += 1
  }

  console.log(`Dados sintéticos de vendas por vendedor prontos. Novos pedidos: ${created}.`)
}

main().finally(() => prisma.$disconnect())
