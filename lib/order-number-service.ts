import { randomUUID } from "node:crypto"
import { Prisma, PrismaClient, type OrderChannel } from "@prisma/client"
import { buildOrderNumber, buildOrderNumberDateKey } from "@/lib/order-number"

type OrderNumberTransaction = Prisma.TransactionClient

export async function allocateOrderNumber(
  tx: OrderNumberTransaction,
  input: {
    channel: OrderChannel
    createdAt?: Date
  },
) {
  const createdAt = input.createdAt ?? new Date()
  const dateKey = buildOrderNumberDateKey(createdAt)
  const orderNumberCounterDelegate = (tx as OrderNumberTransaction & {
    orderNumberCounter?: {
      upsert(args: {
        where: {
          dateKey_channel: {
            dateKey: string
            channel: OrderChannel
          }
        }
        create: {
          dateKey: string
          channel: OrderChannel
          lastValue: number
        }
        update: {
          lastValue: {
            increment: number
          }
        }
        select: {
          lastValue: true
        }
      }): Promise<{ lastValue: number }>
    }
  }).orderNumberCounter

  const counter = orderNumberCounterDelegate
    ? await orderNumberCounterDelegate.upsert({
        where: {
          dateKey_channel: {
            dateKey,
            channel: input.channel,
          },
        },
        create: {
          dateKey,
          channel: input.channel,
          lastValue: 1,
        },
        update: {
          lastValue: {
            increment: 1,
          },
        },
        select: {
          lastValue: true,
        },
      })
    : (
        await tx.$queryRaw<Array<{ lastValue: number }>>(Prisma.sql`
          INSERT INTO "order_number_counters" (
            "id",
            "dateKey",
            "channel",
            "lastValue",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${randomUUID()},
            ${dateKey},
            CAST(${input.channel} AS "OrderChannel"),
            1,
            ${createdAt},
            ${createdAt}
          )
          ON CONFLICT ("dateKey", "channel")
          DO UPDATE
          SET
            "lastValue" = "order_number_counters"."lastValue" + 1,
            "updatedAt" = ${createdAt}
          RETURNING "lastValue"
        `)
      )[0]

  return {
    createdAt,
    orderNumber: buildOrderNumber({
      channel: input.channel,
      createdAt,
      sequence: counter.lastValue,
    }),
  }
}

export async function assignMissingOrderNumber(
  prisma: PrismaClient,
  orderId: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        channel: true,
        createdAt: true,
        orderNumber: true,
      },
    })

    if (!order) {
      throw new Error(`Pedido ${orderId} nao encontrado para gerar numero publico.`)
    }

    if (order.orderNumber) {
      return order.orderNumber
    }

    const { orderNumber } = await allocateOrderNumber(tx, {
      channel: order.channel,
      createdAt: order.createdAt,
    })

    await tx.order.update({
      where: { id: order.id },
      data: { orderNumber },
    })

    return orderNumber
  })
}

export async function backfillMissingOrderNumbers(prisma: PrismaClient) {
  const orders = await prisma.order.findMany({
    where: {
      orderNumber: null,
    },
    select: {
      id: true,
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
  })

  let updated = 0

  for (const order of orders) {
    const orderNumber = await assignMissingOrderNumber(prisma, order.id)

    if (orderNumber) {
      updated += 1
    }
  }

  return {
    scanned: orders.length,
    updated,
  }
}
