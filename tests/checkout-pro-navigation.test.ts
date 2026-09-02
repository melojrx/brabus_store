import assert from "node:assert/strict"
import test from "node:test"
import { getCheckoutProNavigation } from "../app/checkout/CheckoutPageClient"

test("opens Mercado Pago in a new tab and keeps the local order URL", () => {
  assert.deepEqual(getCheckoutProNavigation("https://mp.example/pay", "order_123"), {
    paymentUrl: "https://mp.example/pay",
    trackingUrl: "/checkout/success?order_id=order_123",
  })
})
