import { OrderChannel, PrismaClient, ShippingType } from "@prisma/client"
import { createManualOrder } from "@/lib/manual-orders"
import { registerCustomerPayment } from "@/lib/customer-credit"

const prisma = new PrismaClient()

async function main() {
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: "admin@brabus.com" } })
  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { active: true, stock: { gt: 10 }, product: { active: true } },
    include: { product: true },
  })
  const customers = await Promise.all([
    ["Ana Título Aberto", "85999000001", "fiado.demo.ana@brabus.local"],
    ["Bruno Título Parcial", "85999000002", "fiado.demo.bruno@brabus.local"],
    ["Carla Título Quitado", "85999000003", "fiado.demo.carla@brabus.local"],
  ].map(async ([name, phone, email]) => {
    const current = await prisma.customer.findFirst({ where: { email } })
    return current ?? prisma.customer.create({ data: { name, phone, email } })
  }))

  for (const customer of customers) {
    const count = await prisma.customerReceivable.count({ where: { customerId: customer.id } })
    if (count > 0) continue
    await createManualOrder(prisma, {
      userId: null,
      customerId: customer.id,
      actorUserId: actor.id,
      channel: OrderChannel.PDV,
      customerNameSnapshot: customer.name,
      customerPhoneSnapshot: customer.phone,
      items: [{ productId: variant.productId, productVariantId: variant.id, quantity: 1 }],
      shippingType: ShippingType.PICKUP,
      address: {},
      paymentMethod: "FIADO",
      paymentStatus: "PENDING",
    })
  }

  const [partial, settled] = [customers[1], customers[2]]
  const partialTitle = await prisma.customerReceivable.findFirstOrThrow({ where: { customerId: partial.id } })
  const settledTitle = await prisma.customerReceivable.findFirstOrThrow({ where: { customerId: settled.id } })
  await registerCustomerPayment(prisma, { customerId: partial.id, amount: partialTitle.originalAmount.toNumber() / 2, paymentMethod: "MANUAL_PIX", reference: "DEMO-PIX-PARCIAL", actorUserId: actor.id, idempotencyKey: "fiado-demo-partial-v1" })
  await registerCustomerPayment(prisma, { customerId: settled.id, amount: settledTitle.originalAmount.toNumber(), paymentMethod: "CASH", actorUserId: actor.id, idempotencyKey: "fiado-demo-settled-v1" })
  console.log("Dados sintéticos de Fiado prontos: aberto, parcial e quitado.")
}

main().finally(() => prisma.$disconnect())
