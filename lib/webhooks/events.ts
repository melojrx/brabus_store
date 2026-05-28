export const WEBHOOK_EVENTS = ["order.paid"] as const

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number]

export type OrderPaidEventData = {
  orderId: string
  orderNumber: string | null
  channel: string
  total: number
  paymentMethod: string
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  items: Array<{
    productName: string | null
    variantName: string | null
    quantity: number
    unitPrice: number | null
  }>
  paidAt: string
  sellerName: string | null
}

export type WebhookEventDataMap = {
  "order.paid": OrderPaidEventData
}

export type WebhookPayload<T extends WebhookEventType = WebhookEventType> = {
  id: string
  event: T
  createdAt: string
  data: WebhookEventDataMap[T]
}
