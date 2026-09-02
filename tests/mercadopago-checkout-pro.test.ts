import assert from "node:assert/strict"
import test from "node:test"
import {
  buildCheckoutProPreference,
  buildCheckoutUrls,
} from "../lib/mercadopago/checkout-pro"

test("uses canonical return and notification URLs with order_id", () => {
  assert.deepEqual(buildCheckoutUrls("https://loja.example.com/", "order_123"), {
    back_urls: {
      success: "https://loja.example.com/checkout/success?order_id=order_123",
      pending: "https://loja.example.com/checkout/success?order_id=order_123",
      failure: "https://loja.example.com/checkout/cancel?order_id=order_123",
    },
    notification_url: "https://loja.example.com/api/mercadopago/webhook",
  })
})

test("builds a Pix preference whose items total equals the order total", () => {
  const preference = buildCheckoutProPreference({
    orderId: "order_123",
    orderNumber: "BRAB-260901-0001",
    userId: "user_123",
    email: "buyer@example.com",
    paymentMethod: "MERCADO_PAGO_PIX",
    origin: "https://loja.example.com",
    items: [{ id: "variant_1", title: "Produto", quantity: 2, unit_price: 25 }],
  })

  assert.equal(preference.items[0].unit_price * preference.items[0].quantity, 50)
  assert.equal(preference.notification_url, "https://loja.example.com/api/mercadopago/webhook")
  assert.ok(preference.payment_methods)
  assert.deepEqual(preference.payment_methods.excluded_payment_types, [
    { id: "credit_card" },
    { id: "debit_card" },
  ])
})

test("builds a card preference that excludes Pix and preserves installment limits", () => {
  const preference = buildCheckoutProPreference({
    orderId: "order_123",
    orderNumber: "BRAB-260901-0001",
    userId: "user_123",
    email: "buyer@example.com",
    paymentMethod: "MERCADO_PAGO_CARD",
    origin: "https://loja.example.com",
    items: [{ id: "variant_1", title: "Produto", quantity: 1, unit_price: 25 }],
  })

  assert.deepEqual(preference.payment_methods, {
    excluded_payment_types: [{ id: "pix" }],
    installments: 12,
  })
})
