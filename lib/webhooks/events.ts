export const WEBHOOK_EVENTS = ["order.paid", "stock.expiring"] as const

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
  itemsSummary: string
  paidAt: string
  sellerName: string | null
}

export type StockExpiringEventData = {
  alertLevel: "warning" | "critical" | "expired"
  dateKey: string
  items: Array<{
    variantId: string
    productId: string
    productName: string
    productSlug: string
    variantLabel: string
    stock: number
    expiresAt: string
    daysLeft: number
    categoryName: string
    subcategoryName: string | null
  }>
  itemsSummary: string
}

export type WebhookEventDataMap = {
  "order.paid": OrderPaidEventData
  "stock.expiring": StockExpiringEventData
}

export type WebhookPayload<T extends WebhookEventType = WebhookEventType> = {
  id: string
  event: T
  createdAt: string
  data: WebhookEventDataMap[T]
}
