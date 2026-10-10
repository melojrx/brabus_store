import assert from "node:assert/strict"
import test from "node:test"
import { protectProductCost, ProductCostAccessError } from "../lib/product-cost-access"

test("omits normalized cost when the input omits it for any profile", () => {
  for (const canWriteCosts of [true, false]) {
    const data = { name: "Synthetic", costPrice: null }
    assert.deepEqual(protectProductCost(data, { name: "Synthetic" }, canWriteCosts), { name: "Synthetic" })
    assert.deepEqual(data, { name: "Synthetic", costPrice: null })
  }
})

test("denies explicit unauthorized cost writes including zero and null", () => {
  for (const costPrice of [null, 0, 73.19]) {
    assert.throws(() => protectProductCost({ name: "Synthetic", costPrice }, { costPrice }, false), ProductCostAccessError)
  }
})

test("preserves authorized explicit null, zero and known cost", () => {
  for (const costPrice of [null, 0, 73.19]) {
    assert.deepEqual(protectProductCost({ name: "Synthetic", costPrice }, { costPrice }, true), { name: "Synthetic", costPrice })
  }
})
