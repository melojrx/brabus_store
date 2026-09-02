import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test from "node:test"
import {
  getPaymentTransition,
  validateWebhookSignature,
} from "../lib/mercadopago/webhook"

test("accepts the Mercado Pago v1 signature for a payment notification", () => {
  const manifest = "id:123;request-id:req_1;ts:1700000000;"
  const signature = createHmac("sha256", "secret").update(manifest).digest("hex")

  assert.equal(
    validateWebhookSignature({
      signature: `ts=1700000000,v1=${signature}`,
      requestId: "req_1",
      dataId: "123",
      secret: "secret",
    }),
    true,
  )
})

test("rejects incomplete or invalid Mercado Pago signatures", () => {
  assert.equal(
    validateWebhookSignature({
      signature: "ts=1700000000,v1=invalid",
      requestId: "req_1",
      dataId: "123",
      secret: "secret",
    }),
    false,
  )
  assert.equal(
    validateWebhookSignature({
      signature: "ts=1700000000,v1=abc",
      requestId: null,
      dataId: "123",
      secret: "secret",
    }),
    false,
  )
})

test("marks only the first pending approval as stock-decrementing", () => {
  assert.equal(getPaymentTransition("PENDING", "approved").stockAction, "decrement")
  assert.equal(getPaymentTransition("PAID", "approved").stockAction, "none")
})

test("restocks only a paid order fully refunded once", () => {
  assert.equal(getPaymentTransition("PAID", "refunded").stockAction, "increment")
  assert.equal(getPaymentTransition("REFUNDED", "refunded").stockAction, "none")
})
