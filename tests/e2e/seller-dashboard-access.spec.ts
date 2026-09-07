import { expect, test } from "@playwright/test"
import { loginAsSeller } from "./support/admin"

test("vendedor sempre inicia no PDV e não vê nem consulta a dashboard", async ({ page }) => {
  await loginAsSeller(page, "/admin")
  await page.waitForURL(/\/admin\/pdv$/)
  await expect(page.getByRole("heading", { name: "PDV Balcão" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0)

  await page.goto("/admin")
  await page.waitForURL(/\/admin\/pdv$/)

  const response = await page.request.get("/api/admin/dashboard")
  expect(response.status()).toBe(403)
  await expect(response.json()).resolves.toEqual({ error: "Forbidden" })
})

test("vendedor não altera a dashboard padrão do administrador", async ({ page }) => {
  await page.goto("/auth/login")
  await page.getByPlaceholder("seu@email.com").fill("admin@brabus.com")
  await page.getByPlaceholder("••••••••").fill("Admin@123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL(/\/admin$/)
  await expect(page.getByRole("heading", { name: /Dashboard Admin/i })).toBeVisible()

  const response = await page.request.get("/api/admin/dashboard")
  expect(response.status()).toBe(200)
})
