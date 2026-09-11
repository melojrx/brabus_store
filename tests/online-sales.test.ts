import assert from "node:assert/strict"
import test from "node:test"
import { isOnlineSalesEnabled, onlineSalesUnavailableResponse } from "../lib/online-sales"

test("keeps online sales disabled unless the flag is true", () => {
  const previous = process.env.ONLINE_SALES_ENABLED
  try {
    delete process.env.ONLINE_SALES_ENABLED
    assert.equal(isOnlineSalesEnabled(), false)
    process.env.ONLINE_SALES_ENABLED = " TRUE "
    assert.equal(isOnlineSalesEnabled(), true)
    process.env.ONLINE_SALES_ENABLED = "yes"
    assert.equal(isOnlineSalesEnabled(), false)
  } finally {
    if (previous === undefined) delete process.env.ONLINE_SALES_ENABLED
    else process.env.ONLINE_SALES_ENABLED = previous
  }
})

test("returns a stable unavailable response", async () => {
  const response = onlineSalesUnavailableResponse()
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    error: "Vendas online indisponíveis no momento; compre pelo atendimento/PDV.",
    code: "ONLINE_SALES_UNAVAILABLE",
  })
})
