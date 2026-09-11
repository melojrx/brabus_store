import assert from "node:assert/strict"
import test from "node:test"
import { POST as checkoutPost } from "../app/api/checkout/route"
import { GET as checkoutOrderGet } from "../app/api/checkout/order/[id]/route"
import { GET as mercadoPagoPaymentGet } from "../app/api/mercadopago/payment/[id]/route"
import { POST as webhookPost } from "../app/api/mercadopago/webhook/route"

function disableOnlineSales() {
  const previous = process.env.ONLINE_SALES_ENABLED
  process.env.ONLINE_SALES_ENABLED = "false"
  return () => {
    if (previous === undefined) delete process.env.ONLINE_SALES_ENABLED
    else process.env.ONLINE_SALES_ENABLED = previous
  }
}

async function assertUnavailable(response: Response) {
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    error: "Vendas online indisponíveis no momento; compre pelo atendimento/PDV.",
    code: "ONLINE_SALES_UNAVAILABLE",
  })
}

test("blocks checkout before parsing or persisting a request", async () => {
  const restore = disableOnlineSales()
  try {
    await assertUnavailable(await checkoutPost(new Request("http://localhost/api/checkout", { method: "POST" })))
  } finally {
    restore()
  }
})

test("blocks checkout order lookup before authentication", async () => {
  const restore = disableOnlineSales()
  try {
    await assertUnavailable(
      await checkoutOrderGet(new Request("http://localhost/api/checkout/order/order_123"), {
        params: Promise.resolve({ id: "order_123" }),
      }),
    )
  } finally {
    restore()
  }
})

test("blocks Mercado Pago payment lookup before authentication", async () => {
  const restore = disableOnlineSales()
  try {
    await assertUnavailable(
      await mercadoPagoPaymentGet(new Request("http://localhost/api/mercadopago/payment/payment_123"), {
        params: Promise.resolve({ id: "payment_123" }),
      }),
    )
  } finally {
    restore()
  }
})

test("blocks Mercado Pago webhook before processing payment data", async () => {
  const restore = disableOnlineSales()
  try {
    await assertUnavailable(
      await webhookPost(new Request("http://localhost/api/mercadopago/webhook", { method: "POST" })),
    )
  } finally {
    restore()
  }
})
