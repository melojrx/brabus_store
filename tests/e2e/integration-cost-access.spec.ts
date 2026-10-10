import { expect, test } from "@playwright/test"
import { cleanupCostFixture, costTestDb, createCostFixture, createCostKey, productPayload, type CostFixture } from "./support/cost-access"

let fixture: CostFixture
test.beforeAll(async () => { fixture = await createCostFixture() })
test.afterAll(async () => { await cleanupCostFixture(fixture); await costTestDb.$disconnect() })
test.beforeEach(async () => { await costTestDb.product.update({ where: { id: fixture.product.id }, data: { costPrice: 73.19 } }) })

test("operational integration scopes omit product and order cost", async ({ request }) => {
  const { headers } = await createCostKey(fixture, ["read:products", "read:orders"])
  for (const path of [`/api/v1/integrations/products?search=${fixture.prefix}`, `/api/v1/integrations/products/${fixture.product.id}`, `/api/v1/integrations/orders/${fixture.order.id}`]) {
    const response = await request.get(path, { headers })
    expect(response.status()).toBe(200)
    expect(await response.text()).not.toMatch(/costPrice|unitCost/)
  }
})

test("read cost scope adds financial fields but does not allow writing them", async ({ request }) => {
  const { headers } = await createCostKey(fixture, ["read:products", "read:orders", "write:products", "read:costs"])
  const product = await request.get(`/api/v1/integrations/products/${fixture.product.id}`, { headers })
  expect((await product.json()).data.costPrice).toBe(73.19)
  const order = await request.get(`/api/v1/integrations/orders/${fixture.order.id}`, { headers })
  expect((await order.json()).data.items[0].unitCost).toBe(73.19)
  const denied = await request.put(`/api/v1/integrations/products/${fixture.product.id}`, { headers, data: { costPrice: 888 } })
  expect(denied.status()).toBe(403)
  expect((await costTestDb.product.findUniqueOrThrow({ where: { id: fixture.product.id } })).costPrice?.toNumber()).toBe(73.19)
})

test("cost write permission is independent of cost read permission", async ({ request }) => {
  const { headers } = await createCostKey(fixture, ["write:products", "write:costs"])
  const response = await request.put(`/api/v1/integrations/products/${fixture.product.id}`, { headers, data: { ...productPayload(fixture), costPrice: 0 } })
  expect(response.status()).toBe(200)
  expect((await response.json()).data).not.toHaveProperty("costPrice")
  expect((await costTestDb.product.findUniqueOrThrow({ where: { id: fixture.product.id } })).costPrice?.toNumber()).toBe(0)
  const created = await request.post("/api/v1/integrations/products", { headers, data: { ...productPayload(fixture), slug: `${fixture.prefix}-write`, costPrice: 12, variants: [{ name: "Default", stock: 3 }] } })
  expect(created.status()).toBe(201)
  expect((await created.json()).data).not.toHaveProperty("costPrice")
})

test("operational writes preserve cost and reject explicit cost on creation", async ({ request }) => {
  const { headers } = await createCostKey(fixture, ["write:products"])
  const updated = await request.put(`/api/v1/integrations/products/${fixture.product.id}`, { headers, data: { ...productPayload(fixture), description: "Updated synthetic description" } })
  expect(updated.status()).toBe(200)
  expect((await updated.json()).data).not.toHaveProperty("costPrice")
  expect((await costTestDb.product.findUniqueOrThrow({ where: { id: fixture.product.id } })).costPrice?.toNumber()).toBe(73.19)
  const denied = await request.post("/api/v1/integrations/products", { headers, data: { ...productPayload(fixture), slug: `${fixture.prefix}-denied`, costPrice: null, variants: [{ stock: 1 }] } })
  expect(denied.status()).toBe(403)
  expect(await costTestDb.product.findUnique({ where: { slug: `${fixture.prefix}-denied` } })).toBeNull()
  const created = await request.post("/api/v1/integrations/products", { headers, data: { ...productPayload(fixture), slug: `${fixture.prefix}-operational`, variants: [{ stock: 1 }] } })
  expect(created.status()).toBe(201)
  expect((await created.json()).data).not.toHaveProperty("costPrice")
})

test("financial integration dashboard requires an explicit read cost scope", async ({ request }) => {
  const operational = await createCostKey(fixture, ["read:dashboard"])
  expect((await request.get("/api/v1/integrations/dashboard", { headers: operational.headers })).status()).toBe(403)
  const financial = await createCostKey(fixture, ["read:dashboard", "read:costs"])
  const response = await request.get("/api/v1/integrations/dashboard", { headers: financial.headers })
  expect(response.status()).toBe(200)
  expect((await response.json()).data.financial.cards).toHaveProperty("cost")
})
