import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus, PrismaClient, Role, ShippingType } from "@prisma/client"
import {
  assertFiadoCustomerEligible,
  registerCustomerPayment,
  reverseCustomerPayment,
  setCustomerCreditBlocked,
} from "../lib/customer-credit"
import { getPaymentMethodLabel } from "../lib/payment-status"

const prisma = new PrismaClient()
const testPrefix = `fiado-test-${crypto.randomUUID()}`

before(async () => {
  await prisma.$connect()
})

after(async () => {
  const customers = await prisma.customer.findMany({
    where: { email: { startsWith: testPrefix } },
    select: { id: true },
  })
  const customerIds = customers.map((customer) => customer.id)

  if (customerIds.length > 0) {
    const payments = await prisma.customerPayment.findMany({
      where: { customerId: { in: customerIds } },
      select: { id: true },
    })
    const receivables = await prisma.customerReceivable.findMany({
      where: { customerId: { in: customerIds } },
      select: { id: true, orderId: true },
    })

    await prisma.customerPaymentAllocation.deleteMany({
      where: { OR: [{ paymentId: { in: payments.map((payment) => payment.id) } }, { receivableId: { in: receivables.map((receivable) => receivable.id) } }] },
    })
    await prisma.customerPayment.deleteMany({ where: { customerId: { in: customerIds } } })
    await prisma.customerCreditEvent.deleteMany({ where: { customerId: { in: customerIds } } })
    await prisma.customerReceivable.deleteMany({ where: { customerId: { in: customerIds } } })
    await prisma.order.deleteMany({ where: { id: { in: receivables.map((receivable) => receivable.orderId) } } })
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } })
  }

  await prisma.user.deleteMany({ where: { email: { startsWith: testPrefix } } })
  await prisma.$disconnect()
})

async function createCreditFixture(amounts: number[]) {
  const suffix = crypto.randomUUID()
  const actor = await prisma.user.create({
    data: {
      name: "Caixa de teste",
      email: `${testPrefix}-${suffix}@example.test`,
      password: "not-used-in-tests",
      role: Role.ADMIN,
    },
  })
  const customer = await prisma.customer.create({
    data: {
      name: "Cliente de teste",
      phone: "85999990000",
      email: `${testPrefix}-${suffix}@example.test`,
    },
  })
  const receivables = []
  for (const [index, amount] of amounts.entries()) {
    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-${suffix.slice(0, 8)}-${index}`,
        channel: OrderChannel.PDV,
        status: OrderStatus.DELIVERED,
        paymentMethod: PaymentMethod.FIADO,
        paymentStatus: PaymentStatus.PENDING,
        total: amount,
        shippingType: ShippingType.PICKUP,
        customerId: customer.id,
        customerNameSnapshot: customer.name,
        customerPhoneSnapshot: customer.phone,
      },
    })
    receivables.push(await prisma.customerReceivable.create({
      data: {
        customerId: customer.id,
        orderId: order.id,
        originalAmount: amount,
        openAmount: amount,
        createdAt: new Date(Date.now() + index),
      },
    }))
  }

  return { actor, customer, receivables }
}

test("labels fiado as a PDV payment method", () => {
  assert.equal(getPaymentMethodLabel("FIADO" as never), "Fiado")
})

test("accepts an active customer with name and phone for fiado", () => {
  assert.doesNotThrow(() =>
    assertFiadoCustomerEligible({
      id: "customer-1",
      name: "Ana",
      phone: "85999990000",
      active: true,
      creditBlocked: false,
    }),
  )
})

test("rejects fiado for a customer without phone", () => {
  assert.throws(
    () =>
      assertFiadoCustomerEligible({
        id: "customer-1",
        name: "Ana",
        phone: null,
        active: true,
        creditBlocked: false,
      }),
    /telefone/i,
  )
})

test("rejects fiado for a customer with blocked credit", () => {
  assert.throws(
    () =>
      assertFiadoCustomerEligible({
        id: "customer-1",
        name: "Ana",
        phone: "85999990000",
        active: true,
        creditBlocked: true,
      }),
    /bloqueado/i,
  )
})

test("allocates a partial receipt to oldest titles in FIFO order", async () => {
  const fixture = await createCreditFixture([10, 20])
  const result = await registerCustomerPayment(prisma, {
    customerId: fixture.customer.id,
    amount: 25,
    paymentMethod: "CASH",
    actorUserId: fixture.actor.id,
    idempotencyKey: crypto.randomUUID(),
  })

  assert.deepEqual(
    result.allocations.map((allocation) => [allocation.receivableId, allocation.amount, allocation.openAmount]),
    [[fixture.receivables[0].id, 10, 0], [fixture.receivables[1].id, 15, 5]],
  )
  const [firstOrder, secondOrder] = await Promise.all(
    fixture.receivables.map((receivable) => prisma.order.findUniqueOrThrow({ where: { id: receivable.orderId } })),
  )
  assert.equal(firstOrder.paymentStatus, PaymentStatus.PAID)
  assert.equal(firstOrder.status, OrderStatus.DELIVERED)
  assert.equal(secondOrder.paymentStatus, PaymentStatus.PENDING)
})

test("returns the original receipt for an idempotent request", async () => {
  const fixture = await createCreditFixture([20])
  const idempotencyKey = crypto.randomUUID()
  const input = {
    customerId: fixture.customer.id,
    amount: 20,
    paymentMethod: "MANUAL_PIX" as const,
    reference: "PIX-TEST-001",
    actorUserId: fixture.actor.id,
    idempotencyKey,
  }

  const first = await registerCustomerPayment(prisma, input)
  const second = await registerCustomerPayment(prisma, input)

  assert.equal(second.paymentId, first.paymentId)
  assert.equal(await prisma.customerPayment.count({ where: { idempotencyKey } }), 1)
})

test("rejects a receipt greater than the open balance", async () => {
  const fixture = await createCreditFixture([10])

  await assert.rejects(
    () => registerCustomerPayment(prisma, {
      customerId: fixture.customer.id,
      amount: 10.01,
      paymentMethod: "CASH",
      actorUserId: fixture.actor.id,
      idempotencyKey: crypto.randomUUID(),
    }),
    /maior que o saldo/i,
  )
})

test("reverses allocations without deleting the original receipt", async () => {
  const fixture = await createCreditFixture([10, 20])
  const receipt = await registerCustomerPayment(prisma, {
    customerId: fixture.customer.id,
    amount: 25,
    paymentMethod: "POS_DEBIT",
    actorUserId: fixture.actor.id,
    idempotencyKey: crypto.randomUUID(),
  })

  await reverseCustomerPayment(prisma, {
    customerId: fixture.customer.id,
    paymentId: receipt.paymentId,
    actorUserId: fixture.actor.id,
    reason: "Valor digitado incorretamente",
  })

  const [payment, firstReceivable, secondReceivable] = await Promise.all([
    prisma.customerPayment.findUniqueOrThrow({ where: { id: receipt.paymentId } }),
    prisma.customerReceivable.findUniqueOrThrow({ where: { id: fixture.receivables[0].id } }),
    prisma.customerReceivable.findUniqueOrThrow({ where: { id: fixture.receivables[1].id } }),
  ])
  assert.ok(payment.reversedAt)
  assert.equal(firstReceivable.openAmount.toNumber(), 10)
  assert.equal(secondReceivable.openAmount.toNumber(), 20)
})

test("records an administrative credit block without preventing existing receipts", async () => {
  const fixture = await createCreditFixture([10])

  await setCustomerCreditBlocked(prisma, {
    customerId: fixture.customer.id,
    blocked: true,
    reason: "Solicitado pela gerência",
    actorUserId: fixture.actor.id,
  })

  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: fixture.customer.id } })
  assert.equal(customer.creditBlocked, true)
  assert.equal(customer.creditBlockedReason, "Solicitado pela gerência")
})
