import test from "node:test"
import assert from "node:assert/strict"
import {
  calculateCashChange,
  calculateDiscountedOrderTotal,
  normalizeDiscountAmount,
} from "../lib/order-discount"

test("keeps net total equal to gross total without discount", () => {
  const result = calculateDiscountedOrderTotal({
    subtotal: 100,
    shippingCost: 15,
    discountAmount: null,
  })

  assert.equal(result.grossTotal, 115)
  assert.equal(result.discountAmount, 0)
  assert.equal(result.total, 115)
})

test("subtracts a fixed reais discount from the net total", () => {
  const result = calculateDiscountedOrderTotal({
    subtotal: 100,
    shippingCost: 15,
    discountAmount: 12.349,
  })

  assert.equal(result.grossTotal, 115)
  assert.equal(result.discountAmount, 12.35)
  assert.equal(result.total, 102.65)
})

test("rejects discount greater than gross total", () => {
  assert.throws(
    () =>
      calculateDiscountedOrderTotal({
        subtotal: 50,
        shippingCost: 5,
        discountAmount: 56,
      }),
    /desconto nao pode ser maior/i,
  )
})

test("rejects negative discount", () => {
  assert.throws(() => normalizeDiscountAmount(-1), /desconto invalido/i)
})

test("calculates cash change from net total after discount", () => {
  const changeAmount = calculateCashChange({
    total: 82.5,
    cashReceivedAmount: 100,
  })

  assert.equal(changeAmount, 17.5)
})
