import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { OrderChannel, PrismaClient, ShippingType } from "@prisma/client"
import { createManualOrder } from "../lib/manual-orders"
import { createPdvOrderSchema } from "../lib/pdv"

const prisma = new PrismaClient()
const testPrefix = `pdv-fiado-test-${crypto.randomUUID()}`

before(async () => {
  await prisma.$connect()
})

after(async () => {
  const customers = await prisma.customer.findMany({
    where: { email: { startsWith: testPrefix } },
    select: { id: true },
  })
  const customerIds = customers.map((customer) => customer.id)
  const orders = await prisma.order.findMany({
    where: { customerId: { in: customerIds } },
    select: { id: true },
  })
  const orderIds = orders.map((order) => order.id)
  const receivables = await prisma.customerReceivable.findMany({
    where: { orderId: { in: orderIds } },
    select: { id: true },
  })
  await prisma.customerPaymentAllocation.deleteMany({ where: { receivableId: { in: receivables.map((item) => item.id) } } })
  await prisma.customerReceivable.deleteMany({ where: { orderId: { in: orderIds } } })
  await prisma.customerCreditEvent.deleteMany({ where: { customerId: { in: customerIds } } })
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } })
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: testPrefix } } })
  await prisma.$disconnect()
})

const validPdvPayload = {
  customerId: "customer-1",
  customerName: null,
  customerEmail: null,
  customerPhone: null,
  items: [{ productId: "product-1", productVariantId: "variant-1", quantity: 1 }],
  shippingType: "PICKUP",
  address: {},
  paymentMethod: "FIADO",
  paymentStatus: "PENDING",
  paymentInstallments: null,
  manualPaymentReference: null,
  manualPaymentNotes: null,
  cashReceivedAmount: null,
  changeAmount: null,
  discountAmount: null,
}

test("accepts a fiado PDV payload for a registered customer", () => {
  assert.equal(createPdvOrderSchema.safeParse(validPdvPayload).success, true)
})

test("requires a registered customer for a fiado PDV payload", () => {
  assert.equal(createPdvOrderSchema.safeParse({ ...validPdvPayload, customerId: null }).success, false)
})

test("requires fiado to remain pending", () => {
  assert.equal(createPdvOrderSchema.safeParse({ ...validPdvPayload, paymentStatus: "PAID" }).success, false)
})

test("creates a delivered fiado order, title and stock decrement together", async () => {
  const suffix = crypto.randomUUID()
  const actor = await prisma.user.create({
    data: {
      name: "Caixa de teste",
      email: `${testPrefix}-${suffix}@example.test`,
      password: "not-used-in-tests",
      role: "SELLER",
    },
  })
  const customer = await prisma.customer.create({
    data: {
      name: "Cliente fiado",
      phone: "85999990000",
      email: `${testPrefix}-${suffix}@example.test`,
    },
  })
  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { active: true, product: { active: true } },
    include: { product: true },
  })
  const stockBefore = variant.stock

  const result = await createManualOrder(prisma, {
    userId: null as never,
    customerId: customer.id,
    actorUserId: actor.id,
    channel: OrderChannel.PDV,
    customerNameSnapshot: customer.name,
    customerPhoneSnapshot: customer.phone,
    items: [{ productId: variant.productId, productVariantId: variant.id, quantity: 1 }],
    shippingType: ShippingType.PICKUP,
    address: {},
    paymentMethod: "FIADO" as never,
    paymentStatus: "PENDING",
  })

  const order = await prisma.order.findUniqueOrThrow({ where: { id: result.id } })
  const receivable = await prisma.customerReceivable.findUniqueOrThrow({ where: { orderId: order.id } })
  const variantAfter = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })

  assert.equal(order.status, "DELIVERED")
  assert.equal(order.paymentStatus, "PENDING")
  assert.equal(receivable.openAmount.toNumber(), order.total.toNumber())
  assert.equal(variantAfter.stock, stockBefore - 1)
})
