import { expect, test, type Page } from "@playwright/test"
import { createCostFixture, cleanupCostFixture, costTestDb, syntheticPassword } from "./support/cost-access"

async function expectCustomerBrand(page: Page) {
  await expect(page.locator(".theme-storefront")).toHaveCSS("--color-primary", /#d4a346/i)
  const nav = page.getByRole("navigation").first()
  await expect(nav.getByRole("img", { name: "Brabu’s Performance Store", exact: true })).toBeVisible()
  await expect(page.locator(".brand-footer")).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
}

for (const width of [375, 768, 1440]) {
  test(`customer entry and unavailable checkout share branding at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"]) {
      await page.goto(path)
      if (process.env.CUSTOMER_BRAND_CAPTURE_BEFORE === "true") {
        await page.screenshot({ path: "outputs/vitrine-identidade-brabus/g8-login-antes.png" })
      }
      await expectCustomerBrand(page)
      const logo = page.locator("main").getByRole("img", { name: "Brabu’s Performance Store", exact: true })
      await expect(logo).toBeVisible()
      await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
      await expect(page.locator("main").getByRole("heading", { level: 1 })).toHaveCount(1)
      if (path === "/auth/login") {
        await page.screenshot({ path: `outputs/vitrine-identidade-brabus/g8-login-${width}.png` })
      }
      if (path === "/auth/reset-password") await expect(page.getByText("Link inválido. Solicite uma nova recuperação de senha.")).toBeVisible()
    }
    await page.goto("/account")
    await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=/)
    for (const path of ["/cart", "/checkout", "/checkout/success", "/checkout/cancel"]) {
      await page.goto(path)
      await expectCustomerBrand(page)
      await expect(page.getByText("Vendas online indisponíveis no momento; compre pelo atendimento/PDV.", { exact: true })).toBeVisible()
      await expect(page.getByRole("link", { name: "Abrir carrinho", exact: true })).toHaveCount(0)
      await expect(page.locator("main form")).toHaveCount(0)
      await expect(page.locator("main").getByRole("link", { name: "Falar no WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\//)
      if (path === "/checkout") await page.screenshot({ path: `outputs/vitrine-identidade-brabus/g8-checkout-${width}.png` })
    }
  })
}

test("customer login, profile and order navigation retain their flows with the new identity", async ({ page }) => {
  const fixture = await createCostFixture()
  try {
    await page.goto("/auth/login")
    await page.getByPlaceholder("seu@email.com").fill(fixture.customer.email)
    await page.getByPlaceholder("••••••••").fill("incorrect-password")
    await page.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page.getByText("Email ou senha inválidos. Verifique e tente novamente.")).toBeVisible()
    await page.goto("/account")
    await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=/)
    await page.getByPlaceholder("seu@email.com").fill(fixture.customer.email)
    await page.getByPlaceholder("••••••••").fill(syntheticPassword)
    await page.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page).toHaveURL(/\/account$/)
    await expectCustomerBrand(page)
    await page.getByLabel("Nome", { exact: true }).fill("Cliente de teste G8")
    await page.getByRole("button", { name: "Salvar Dados", exact: true }).click()
    await expect.poll(async () => (await costTestDb.user.findUniqueOrThrow({ where: { id: fixture.customer.id } })).name).toBe("Cliente de teste G8")
    await page.reload()
    await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Cliente de teste G8")
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const path of ["/account", "/account/orders", `/account/orders/${fixture.order.id}`]) {
        await page.goto(path)
        await expectCustomerBrand(page)
        if (path === "/account") await page.screenshot({ path: `outputs/vitrine-identidade-brabus/g8-account-${width}.png` })
      }
    }
    const before = await costTestDb.order.count()
    const response = await page.request.post("/api/checkout", { data: {} })
    expect(response.status()).toBe(503)
    expect((await response.json()).code).toBe("ONLINE_SALES_UNAVAILABLE")
    const payment = await page.request.get("/api/mercadopago/payment/g8-unavailable")
    expect(payment.status()).toBe(503)
    expect(await costTestDb.order.count()).toBe(before)
  } finally {
    await cleanupCostFixture(fixture)
  }
})
