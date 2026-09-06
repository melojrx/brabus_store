import assert from "node:assert/strict"
import test from "node:test"
import { buildTitlePaymentPayload } from "../lib/title-payment-input"

test("builds a title receipt payload from a reais-masked amount", () => {
  const payload = buildTitlePaymentPayload({
    amount: "R$ 12,34",
    paymentMethod: "CASH",
    idempotencyKey: "3b241101-e2bb-4255-8caf-4136c566a962",
  })

  assert.deepEqual(payload, {
    amount: 12.34,
    paymentMethod: "CASH",
    idempotencyKey: "3b241101-e2bb-4255-8caf-4136c566a962",
  })
})
