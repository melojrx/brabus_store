import prisma from "@/lib/prisma"
import { dispatchWebhookEvent } from "./dispatcher"
import type { OrderPaidEventData } from "./events"

export async function dispatchOrderPaid(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      channel: true,
      total: true,
      paymentMethod: true,
      customerNameSnapshot: true,
      customerEmailSnapshot: true,
      customerPhoneSnapshot: true,
      paidAt: true,
      seller: { select: { name: true } },
      items: {
        select: {
          productNameSnapshot: true,
          variantNameSnapshot: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
  })

  if (!order) return

  function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const items = order.items.map((item) => ({
    productName: item.productNameSnapshot,
    variantName: item.variantNameSnapshot,
    quantity: item.quantity,
    unitPrice: item.unitPrice?.toNumber() ?? null,
  }))

  const itemsSummary = items
    .map((item) => {
      const name = [item.productName, item.variantName].filter(Boolean).join(" ")
      const price = item.unitPrice != null ? ` — ${formatCurrency(item.unitPrice)}` : ""
      return `• ${name} — qtd. ${item.quantity}${price}`
    })
    .join("\n")

  const data: OrderPaidEventData = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    channel: order.channel,
    total: order.total.toNumber(),
    paymentMethod: order.paymentMethod,
    customerName: order.customerNameSnapshot,
    customerEmail: order.customerEmailSnapshot,
    customerPhone: order.customerPhoneSnapshot,
    items,
    itemsSummary,
    paidAt: order.paidAt?.toISOString() ?? new Date().toISOString(),
    sellerName: order.seller?.name ?? null,
  }

  dispatchWebhookEvent("order.paid", data).catch(() => {})
}
