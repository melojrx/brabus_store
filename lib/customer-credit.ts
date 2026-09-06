import {
  CustomerReceivableStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client"

export type CustomerCreditEligibility = {
  id: string
  name: string
  phone: string | null
  active: boolean
  creditBlocked: boolean
}

export type CustomerPaymentMethod = "CASH" | "MANUAL_PIX" | "POS_DEBIT" | "POS_CREDIT"

export type RegisterCustomerPaymentInput = {
  customerId: string
  amount: number
  paymentMethod: CustomerPaymentMethod
  reference?: string | null
  notes?: string | null
  actorUserId: string
  idempotencyKey: string
}

export type CustomerPaymentResult = {
  paymentId: string
  customerId: string
  amount: number
  allocations: Array<{
    receivableId: string
    orderId: string
    orderNumber: string | null
    amount: number
    openAmount: number
    status: "OPEN" | "PARTIAL" | "SETTLED"
  }>
}

type PaymentRecord = Prisma.CustomerPaymentGetPayload<{
  include: {
    allocations: {
      include: {
        receivable: {
          include: {
            order: true
          }
        }
      }
    }
  }
}>

const RECEIPT_METHODS = new Set<CustomerPaymentMethod>([
  "CASH",
  "MANUAL_PIX",
  "POS_DEBIT",
  "POS_CREDIT",
])

function normalizeMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Informe um valor de recebimento válido.")
  }

  return Math.round((value + Number.EPSILON) * 100) / 100
}

function toMoney(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber()
}

function serializePayment(payment: PaymentRecord): CustomerPaymentResult {
  return {
    paymentId: payment.id,
    customerId: payment.customerId,
    amount: toMoney(payment.amount),
    allocations: payment.allocations.map((allocation) => ({
      receivableId: allocation.receivableId,
      orderId: allocation.receivable.orderId,
      orderNumber: allocation.receivable.order.orderNumber,
      amount: toMoney(allocation.amount),
      openAmount: toMoney(allocation.receivable.openAmount),
      status: allocation.receivable.status as "OPEN" | "PARTIAL" | "SETTLED",
    })),
  }
}

async function findPaymentByIdempotencyKey(
  prisma: PrismaClient | Prisma.TransactionClient,
  idempotencyKey: string,
) {
  return prisma.customerPayment.findUnique({
    where: { idempotencyKey },
    include: {
      allocations: {
        orderBy: { createdAt: "asc" },
        include: {
          receivable: {
            include: { order: true },
          },
        },
      },
    },
  })
}

export function assertFiadoCustomerEligible(customer: CustomerCreditEligibility) {
  if (!customer.active) {
    throw new Error("O cliente está inativo.")
  }

  if (!customer.name.trim()) {
    throw new Error("O cliente precisa ter nome cadastrado.")
  }

  if (!customer.phone?.trim()) {
    throw new Error("O cliente precisa ter telefone cadastrado.")
  }

  if (customer.creditBlocked) {
    throw new Error("O fiado está bloqueado para este cliente.")
  }
}

export async function registerCustomerPayment(
  prisma: PrismaClient,
  input: RegisterCustomerPaymentInput,
): Promise<CustomerPaymentResult> {
  const amount = normalizeMoney(input.amount)

  if (!RECEIPT_METHODS.has(input.paymentMethod)) {
    throw new Error("Método de recebimento inválido.")
  }

  if (input.paymentMethod === "MANUAL_PIX" && !input.reference?.trim()) {
    throw new Error("Informe a referência do Pix manual.")
  }

  const existingPayment = await findPaymentByIdempotencyKey(prisma, input.idempotencyKey)
  if (existingPayment) {
    if (existingPayment.customerId !== input.customerId) {
      throw new Error("A chave de idempotência já foi usada para outro cliente.")
    }

    return serializePayment(existingPayment)
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const duplicatedPayment = await findPaymentByIdempotencyKey(tx, input.idempotencyKey)
      if (duplicatedPayment) {
        if (duplicatedPayment.customerId !== input.customerId) {
          throw new Error("A chave de idempotência já foi usada para outro cliente.")
        }

        return serializePayment(duplicatedPayment)
      }

      const receivables = await tx.customerReceivable.findMany({
        where: {
          customerId: input.customerId,
          status: { in: [CustomerReceivableStatus.OPEN, CustomerReceivableStatus.PARTIAL] },
          openAmount: { gt: 0 },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { order: true },
      })
      const openBalance = receivables.reduce((sum, receivable) => sum + toMoney(receivable.openAmount), 0)

      if (amount > openBalance) {
        throw new Error("O valor do recebimento é maior que o saldo em aberto.")
      }

      const payment = await tx.customerPayment.create({
        data: {
          customerId: input.customerId,
          amount,
          paymentMethod: input.paymentMethod as PaymentMethod,
          reference: input.reference?.trim() || null,
          notes: input.notes?.trim() || null,
          receivedByUserId: input.actorUserId,
          idempotencyKey: input.idempotencyKey,
        },
      })
      let remaining = amount
      const allocations: CustomerPaymentResult["allocations"] = []

      for (const receivable of receivables) {
        if (remaining <= 0) {
          break
        }

        const currentOpenAmount = toMoney(receivable.openAmount)
        const allocationAmount = Math.min(remaining, currentOpenAmount)
        const nextOpenAmount = Math.round((currentOpenAmount - allocationAmount + Number.EPSILON) * 100) / 100
        const nextStatus = nextOpenAmount === 0
          ? CustomerReceivableStatus.SETTLED
          : CustomerReceivableStatus.PARTIAL

        await tx.customerPaymentAllocation.create({
          data: {
            paymentId: payment.id,
            receivableId: receivable.id,
            amount: allocationAmount,
          },
        })
        await tx.customerReceivable.update({
          where: { id: receivable.id },
          data: {
            openAmount: nextOpenAmount,
            status: nextStatus,
            settledAt: nextOpenAmount === 0 ? new Date() : null,
          },
        })

        if (nextOpenAmount === 0) {
          await tx.order.update({
            where: { id: receivable.orderId },
            data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date() },
          })
        }

        allocations.push({
          receivableId: receivable.id,
          orderId: receivable.orderId,
          orderNumber: receivable.order.orderNumber,
          amount: allocationAmount,
          openAmount: nextOpenAmount,
          status: nextStatus,
        })
        remaining = Math.round((remaining - allocationAmount + Number.EPSILON) * 100) / 100
      }

      await tx.customerCreditEvent.create({
        data: {
          customerId: input.customerId,
          actorUserId: input.actorUserId,
          type: "PAYMENT_RECORDED",
          amount,
          paymentId: payment.id,
        },
      })

      return {
        paymentId: payment.id,
        customerId: input.customerId,
        amount,
        allocations,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const payment = await findPaymentByIdempotencyKey(prisma, input.idempotencyKey)
      if (payment && payment.customerId === input.customerId) {
        return serializePayment(payment)
      }
    }

    throw error
  }
}

export async function reverseCustomerPayment(
  prisma: PrismaClient,
  input: { customerId: string; paymentId: string; actorUserId: string; reason: string },
) {
  const reason = input.reason.trim()
  if (reason.length < 3) {
    throw new Error("Informe o motivo do estorno.")
  }

  await prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.findFirst({
      where: { id: input.paymentId, customerId: input.customerId },
      include: { allocations: { include: { receivable: true } } },
    })

    if (!payment) {
      throw new Error("Recebimento não encontrado para este cliente.")
    }
    if (payment.reversedAt) {
      throw new Error("Este recebimento já foi estornado.")
    }

    for (const allocation of payment.allocations) {
      const nextOpenAmount = Math.round((toMoney(allocation.receivable.openAmount) + toMoney(allocation.amount) + Number.EPSILON) * 100) / 100
      const originalAmount = toMoney(allocation.receivable.originalAmount)
      const nextStatus = nextOpenAmount >= originalAmount
        ? CustomerReceivableStatus.OPEN
        : CustomerReceivableStatus.PARTIAL

      await tx.customerReceivable.update({
        where: { id: allocation.receivableId },
        data: {
          openAmount: nextOpenAmount,
          status: nextStatus,
          settledAt: null,
        },
      })
      await tx.order.update({
        where: { id: allocation.receivable.orderId },
        data: { paymentStatus: PaymentStatus.PENDING, paidAt: null },
      })
    }

    await tx.customerPayment.update({
      where: { id: payment.id },
      data: {
        reversedAt: new Date(),
        reversedByUserId: input.actorUserId,
        reversalReason: reason,
      },
    })
    await tx.customerCreditEvent.create({
      data: {
        customerId: input.customerId,
        actorUserId: input.actorUserId,
        type: "PAYMENT_REVERSED",
        amount: payment.amount,
        paymentId: payment.id,
        reason,
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function setCustomerCreditBlocked(
  prisma: PrismaClient,
  input: { customerId: string; blocked: boolean; reason?: string | null; actorUserId: string },
) {
  const reason = input.reason?.trim() || null
  if (input.blocked && !reason) {
    throw new Error("Informe o motivo do bloqueio de fiado.")
  }

  await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: input.customerId }, select: { id: true } })
    if (!customer) {
      throw new Error("Cliente não encontrado.")
    }

    await tx.customer.update({
      where: { id: input.customerId },
      data: {
        creditBlocked: input.blocked,
        creditBlockedReason: input.blocked ? reason : null,
        creditBlockedAt: input.blocked ? new Date() : null,
        creditBlockedByUserId: input.blocked ? input.actorUserId : null,
      },
    })
    await tx.customerCreditEvent.create({
      data: {
        customerId: input.customerId,
        actorUserId: input.actorUserId,
        type: input.blocked ? "CREDIT_BLOCKED" : "CREDIT_UNBLOCKED",
        reason,
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
