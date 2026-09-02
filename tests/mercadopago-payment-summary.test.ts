import assert from "node:assert/strict"
import test from "node:test"
import { serializeMercadoPagoPaymentSummary } from "../lib/mercadopago/checkout-pro"

test("returns only the checkout payment fields safe for the order owner", () => {
  assert.deepEqual(
    serializeMercadoPagoPaymentSummary({
      id: 10,
      status: "approved",
      status_detail: "accredited",
      payment_type_id: "pix",
      transaction_amount: 50,
      external_reference: "order_123",
      payer: { email: "private@example.com" },
    }),
    {
      id: "10",
      status: "approved",
      statusDetail: "accredited",
      paymentType: "pix",
      amount: 50,
      orderId: "order_123",
    },
  )
})
