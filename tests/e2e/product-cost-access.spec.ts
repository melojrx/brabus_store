import { expect, test } from "@playwright/test"
import { cleanupCostFixture, costTestDb, createCostFixture, createCostKey, loginCostUser, productPayload, type CostFixture } from "./support/cost-access"

let fixture: CostFixture
test.beforeAll(async () => { fixture = await createCostFixture() })
test.afterAll(async () => { await cleanupCostFixture(fixture); await costTestDb.$disconnect() })
test.beforeEach(async () => {
  await costTestDb.product.update({ where: { id: fixture.product.id }, data: { costPrice: 73.19, name: fixture.product.name } })
  await costTestDb.productVariant.update({ where: { id: fixture.product.variants[0].id }, data: { stock: 25 } })
})

test("public and customer catalog responses omit cost, including page payloads", async ({ page }) => {
  for (const email of [null, fixture.customer.email]) {
    if (email) await loginCostUser(page, email)
    for (const path of [`/api/products?search=${fixture.prefix}`, `/api/products/${fixture.product.slug}`, "/api/products/featured"]) {
      const response = await page.request.get(path)
      expect(response.status()).toBe(200)
      expect(await response.text()).not.toContain("costPrice")
    }
    for (const path of ["/", `/products/${fixture.product.slug}`, `/products/${fixture.product.slug}?_rsc=synthetic`]) {
      const response = await page.request.get(path, { headers: path.includes("_rsc") ? { RSC: "1" } : {} })
      expect(response.status()).toBe(200)
      expect(await response.text()).not.toContain("costPrice")
    }
  }
})

test("seller sees commercial products without cost in API, HTML and editor", async ({ page }) => {
  await loginCostUser(page, fixture.seller.email)
  const response = await page.request.get("/api/admin/products")
  expect(response.status()).toBe(200)
  expect(await response.text()).not.toContain("costPrice")
  await page.goto(`/admin/products?search=${fixture.prefix}`)
  await expect(page.getByRole("columnheader", { name: "Custo", exact: true })).toHaveCount(0)
  expect(await page.content()).not.toContain('"costPrice"')
  for (const path of [`/admin/products/${fixture.product.id}/edit`, "/admin/products/new"]) {
    const response = await page.request.get(path, { headers: { RSC: "1" } })
    expect(await response.text()).not.toContain("costPrice")
    await page.goto(path)
    await expect(page.locator("#product-cost-price")).toHaveCount(0)
    await expect(page.getByLabel("Margem bruta")).toHaveCount(0)
  }
})

test("seller edits commercial data without erasing known or zero cost", async ({ page }) => {
  await loginCostUser(page, fixture.seller.email)
  for (const cost of [73.19, 0]) {
    await costTestDb.product.update({ where: { id: fixture.product.id }, data: { costPrice: cost } })
    const response = await page.request.put(`/api/admin/products/${fixture.product.id}`, { data: { ...productPayload(fixture), name: "Synthetic updated" } })
    expect(response.status()).toBe(200)
    expect(await response.text()).not.toContain("costPrice")
    const product = await costTestDb.product.findUniqueOrThrow({ where: { id: fixture.product.id } })
    expect(product.costPrice?.toNumber()).toBe(cost)
    expect(product.name).toBe("Synthetic updated")
  }
})

test("seller explicit cost writes fail before product or variant mutation", async ({ page }) => {
  await loginCostUser(page, fixture.seller.email)
  for (const costPrice of [null, 0, 999]) {
    const response = await page.request.put(`/api/admin/products/${fixture.product.id}`, { data: { ...productPayload(fixture), name: "Must not change", costPrice, variants: [{ ...productPayload(fixture).variants[0], stock: 999 }] } })
    expect(response.status()).toBe(403)
    const product = await costTestDb.product.findUniqueOrThrow({ where: { id: fixture.product.id }, include: { variants: true } })
    expect(product.costPrice?.toNumber()).toBe(73.19)
    expect(product.name).toBe(fixture.product.name)
    expect(product.variants[0].stock).toBe(25)
    const created = await page.request.post("/api/admin/products", { data: { ...productPayload(fixture), slug: `${fixture.prefix}-denied`, costPrice, variants: [{ name: "Default", stock: 1 }] } })
    expect(created.status()).toBe(403)
    expect(await costTestDb.product.findUnique({ where: { slug: `${fixture.prefix}-denied` } })).toBeNull()
  }
})

test("seller creates without cost and admin can subsequently complete it", async ({ page, browser }) => {
  await loginCostUser(page, fixture.seller.email)
  const created = await page.request.post("/api/admin/products", { data: { ...productPayload(fixture), slug: `${fixture.prefix}-new`, variants: [{ name: "Default", stock: 2 }] } })
  expect(created.status()).toBe(201)
  const body = await created.json()
  expect(body).not.toHaveProperty("costPrice")
  expect((await costTestDb.product.findUniqueOrThrow({ where: { id: body.id } })).costPrice).toBeNull()
  const adminPage = await browser.newPage()
  try {
    await loginCostUser(adminPage, fixture.admin.email)
    const updated = await adminPage.request.put(`/api/admin/products/${body.id}`, { data: { ...productPayload(fixture), slug: `${fixture.prefix}-new`, variants: [{ id: body.variants[0].id, stock: 2 }], costPrice: 42.50 } })
    expect(updated.status()).toBe(200)
    expect((await updated.json()).costPrice).toBe(42.50)
  } finally { await adminPage.close() }
})

test("admin keeps cost, margin and operational editing in UI; public catalog stays safe", async ({ page }) => {
  await loginCostUser(page, fixture.admin.email)
  const products = await page.request.get("/api/admin/products")
  expect((await products.json()).find((product: { id: string }) => product.id === fixture.product.id).costPrice).toBe(73.19)
  expect(await (await page.request.get(`/api/products/${fixture.product.slug}`)).text()).not.toContain("costPrice")
  await page.goto(`/admin/products/${fixture.product.id}/edit`)
  await expect(page.locator("#product-cost-price")).toBeVisible()
  await expect(page.getByLabel("Margem bruta")).toBeVisible()
  const unchanged = await page.request.put(`/api/admin/products/${fixture.product.id}`, { data: productPayload(fixture) })
  expect(unchanged.status()).toBe(200)
  expect((await unchanged.json()).costPrice).toBe(73.19)
})

test("seller cannot manage users or integration keys", async ({ page }) => {
  await loginCostUser(page, fixture.seller.email)
  const { key } = await createCostKey(fixture, ["read:products"])
  const attempts = [
    () => page.request.get("/api/admin/users"),
    () => page.request.post("/api/admin/users", { data: { name: "Forbidden", email: `${fixture.prefix}-forbidden@example.test`, role: "ADMIN" } }),
    () => page.request.patch(`/api/admin/users/${fixture.admin.id}`, { data: { name: "Forbidden", role: "SELLER" } }),
    () => page.request.post(`/api/admin/users/${fixture.admin.id}/reset-password`),
    () => page.request.delete(`/api/admin/users/${fixture.admin.id}`),
    () => page.request.get("/api/admin/integrations/api-keys"),
    () => page.request.post("/api/admin/integrations/api-keys", { data: { name: `${fixture.prefix}-forbidden`, actor: "synthetic", scopes: ["read:dashboard"] } }),
    () => page.request.patch(`/api/admin/integrations/api-keys/${key.id}/revoke`),
  ]
  for (const attempt of attempts) expect((await attempt()).status()).toBe(403)
  expect((await costTestDb.user.findUniqueOrThrow({ where: { id: fixture.admin.id } })).role).toBe("ADMIN")
  expect((await costTestDb.integrationApiKey.findUniqueOrThrow({ where: { id: key.id } })).active).toBe(true)
})

test("demoted admin loses cost access with the existing session", async ({ page }) => {
  await loginCostUser(page, fixture.admin.email)
  try {
    await costTestDb.user.update({ where: { id: fixture.admin.id }, data: { role: "SELLER" } })
    expect(await (await page.request.get("/api/admin/products")).text()).not.toContain("costPrice")
    expect((await page.request.get("/api/admin/dashboard")).status()).toBe(403)
    expect((await page.request.get("/api/admin/users")).status()).toBe(403)
  } finally { await costTestDb.user.update({ where: { id: fixture.admin.id }, data: { role: "ADMIN" } }) }
})

test("seller PDV preserves stock and historical cost without exposing cost", async ({ page }) => {
  await loginCostUser(page, fixture.seller.email)
  expect(await (await page.request.get("/api/admin/pdv/products")).text()).not.toContain("costPrice")
  const response = await page.request.post("/api/admin/pdv/orders", { data: { items: [{ productId: fixture.product.id, productVariantId: fixture.product.variants[0].id, quantity: 1 }], shippingType: "PICKUP", address: {}, paymentMethod: "CASH", paymentStatus: "PAID", cashReceivedAmount: 149.99 } })
  expect(response.status()).toBe(201)
  const body = await response.json()
  expect(JSON.stringify(body)).not.toMatch(/unitCost|costPrice/)
  const order = await costTestDb.order.findUniqueOrThrow({ where: { id: body.id }, include: { items: true } })
  expect(order.items[0].unitCost?.toNumber()).toBe(73.19)
  expect((await costTestDb.productVariant.findUniqueOrThrow({ where: { id: fixture.product.variants[0].id } })).stock).toBe(24)
})

test("admin dashboard signals missing historical cost without treating zero as missing", async ({ page }) => {
  await loginCostUser(page, fixture.admin.email)
  const item = await costTestDb.orderItem.findFirstOrThrow({ where: { orderId: fixture.order.id } })
  try {
    await costTestDb.orderItem.update({ where: { id: item.id }, data: { unitCost: null } })
    const data = await (await page.request.get("/api/admin/dashboard?period=all")).json()
    expect(data.financial.missingCostItemCount).toBeGreaterThan(0)
    await page.goto("/admin?tab=financial&period=all")
    await expect(page.getByText(/Custos incompletos em/)).toBeVisible()
    await costTestDb.orderItem.update({ where: { id: item.id }, data: { unitCost: 0 } })
    const complete = await (await page.request.get("/api/admin/dashboard?period=all")).json()
    expect(complete.financial.missingCostItemCount).toBe(data.financial.missingCostItemCount - 1)
  } finally { await costTestDb.orderItem.update({ where: { id: item.id }, data: { unitCost: 73.19 } }) }
})

test("seller creates and edits through the form without needing or erasing cost", async ({ page }) => {
  await loginCostUser(page, fixture.seller.email)
  await page.goto("/admin/products/new")
  await page.locator("#product-name").fill(`${fixture.prefix}-ui`)
  await page.locator("#product-category").selectOption(fixture.category.id)
  await page.locator("#product-price").fill("14999")
  const createResponse = page.waitForResponse(response => response.url().endsWith("/api/admin/products") && response.request().method() === "POST")
  await page.getByRole("button", { name: "Criar produto", exact: true }).click()
  const created = await createResponse
  expect(created.status()).toBe(201)
  const body = await created.json()
  expect(body).not.toHaveProperty("costPrice")
  expect((await costTestDb.product.findUniqueOrThrow({ where: { id: body.id } })).costPrice).toBeNull()

  await page.goto(`/admin/products/${fixture.product.id}/edit`)
  await page.locator("#product-name").fill(`${fixture.prefix}-ui-edited`)
  const editResponse = page.waitForResponse(response => response.url().endsWith(`/api/admin/products/${fixture.product.id}`) && response.request().method() === "PUT")
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click()
  const edited = await editResponse
  expect(edited.status()).toBe(200)
  expect((await edited.json())).not.toHaveProperty("costPrice")
  const product = await costTestDb.product.findUniqueOrThrow({ where: { id: fixture.product.id }, include: { variants: true } })
  expect(product.costPrice?.toNumber()).toBe(73.19)
  expect(product.price.toNumber()).toBe(149.99)
  expect(product.variants[0].id).toBe(fixture.product.variants[0].id)
  expect(product.variants[0].stock).toBe(25)
})

test("admin updates cost through the form and retains user and key management", async ({ page }) => {
  await loginCostUser(page, fixture.admin.email)
  await page.goto(`/admin/products/${fixture.product.id}/edit`)
  await page.locator("#product-cost-price").fill("4250")
  const editResponse = page.waitForResponse(response => response.url().endsWith(`/api/admin/products/${fixture.product.id}`) && response.request().method() === "PUT")
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click()
  expect((await editResponse).status()).toBe(200)
  expect((await costTestDb.product.findUniqueOrThrow({ where: { id: fixture.product.id } })).costPrice?.toNumber()).toBe(42.50)
  expect((await page.request.get("/api/admin/users")).status()).toBe(200)
  const userResponse = await page.request.post("/api/admin/users", { data: { name: "Synthetic staff", email: `${fixture.prefix}-staff@example.test`, role: "SELLER" } })
  expect(userResponse.status()).toBe(201)
  const user = (await userResponse.json()).data
  expect((await page.request.patch(`/api/admin/users/${user.id}`, { data: { name: "Synthetic staff updated" } })).status()).toBe(200)
  expect((await page.request.post(`/api/admin/users/${user.id}/reset-password`)).status()).toBe(200)
  expect((await page.request.delete(`/api/admin/users/${user.id}`)).status()).toBe(200)
  const keyResponse = await page.request.post("/api/admin/integrations/api-keys", { data: { name: `${fixture.prefix}-admin-managed`, actor: fixture.prefix, scopes: ["read:products", "read:costs", "write:costs"] } })
  expect(keyResponse.status()).toBe(201)
  const keyBody = await keyResponse.json()
  expect((await page.request.get("/api/admin/integrations/api-keys")).status()).toBe(200)
  expect((await page.request.patch(`/api/admin/integrations/api-keys/${keyBody.data.apiKey.id}/revoke`)).status()).toBe(200)
  await page.goto("/admin/developer/api-keys")
  await page.getByRole("button", { name: "Nova API Key" }).click()
  await expect(page.getByLabel("Custos (leitura)")).toBeVisible()
  await expect(page.getByLabel("Custos (escrita)")).toBeVisible()
})

test("anonymous and customer access to sensitive admin APIs stays denied", async ({ page }) => {
  const paths = ["/api/admin/products", "/api/admin/users", "/api/admin/integrations/api-keys"]
  for (const path of paths) expect((await page.request.get(path)).status()).toBe(401)
  await loginCostUser(page, fixture.customer.email)
  expect((await page.request.get("/api/admin/products")).status()).toBe(401)
  for (const path of paths.slice(1)) expect((await page.request.get(path)).status()).toBe(403)
})
