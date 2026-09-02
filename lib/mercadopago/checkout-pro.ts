import type { MercadoPagoCreatePreferenceRequest } from "@/lib/mercadopago/types"

type CheckoutProPaymentMethod = "MERCADO_PAGO_CARD" | "MERCADO_PAGO_PIX"

type CheckoutProItem = {
  id: string
  title: string
  quantity: number
  unit_price: number
}

type CheckoutProPreferenceInput = {
  orderId: string
  orderNumber: string
  userId: string
  email: string | null | undefined
  paymentMethod: CheckoutProPaymentMethod
  origin: string
  items: CheckoutProItem[]
}

export function buildCheckoutUrls(origin: string, orderId: string) {
  const baseUrl = origin.replace(/\/$/, "")

  return {
    back_urls: {
      success: `${baseUrl}/checkout/success?order_id=${orderId}`,
      pending: `${baseUrl}/checkout/success?order_id=${orderId}`,
      failure: `${baseUrl}/checkout/cancel?order_id=${orderId}`,
    },
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
  }
}

export function buildCheckoutProPreference({
  orderId,
  orderNumber,
  userId,
  email,
  paymentMethod,
  origin,
  items,
}: CheckoutProPreferenceInput): MercadoPagoCreatePreferenceRequest {
  const excludedPaymentTypes =
    paymentMethod === "MERCADO_PAGO_PIX"
      ? [{ id: "credit_card" }, { id: "debit_card" }]
      : [{ id: "pix" }]

  return {
    items: items.map((item) => ({
      ...item,
      currency_id: "BRL",
    })),
    external_reference: orderId,
    payer: email ? { email } : undefined,
    payment_methods: {
      excluded_payment_types: excludedPaymentTypes,
      installments: 12,
    },
    ...buildCheckoutUrls(origin, orderId),
    metadata: {
      orderId,
      orderNumber,
      userId,
    },
  }
}
