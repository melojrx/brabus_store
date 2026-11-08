import { expect, test } from "@playwright/test"
import { loginAsAdmin } from "./support/admin"

test("admin header unifies branding without changing dashboard or account navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await loginAsAdmin(page, "/admin")
  const nav = page.getByRole("navigation").first()
  const baseline = process.env.ADMIN_HEADER_BASELINE === "true"
  if (baseline) {
    await page.screenshot({ path: "outputs/vitrine-identidade-brabus/g7-admin-antes.png" })
    await expect(nav).toHaveCSS("height", "74px")
    return
  }
  for (const path of ["/admin", "/admin/products", "/admin/settings", "/admin/pdv"]) {
    await page.goto(path)
    const logo = nav.getByRole("img", { name: "Brabu’s Performance Store", exact: true })
    await expect(logo).toBeVisible()
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    await expect(nav).toHaveCSS("--color-primary", /#d4a346/i)
    await expect(nav).toHaveCSS("background-color", "rgb(0, 0, 0)")
    await expect(nav).toHaveCSS("height", "74px")
    if (path !== "/admin/pdv") {
      expect((await page.getByTestId("admin-main").evaluate(el => getComputedStyle(el).getPropertyValue("--color-primary"))).trim().toUpperCase()).toBe("#C9A84C")
      await expect(page.locator(".theme-pdv")).toHaveCount(0)
    }
  }
  await page.goto("/admin")
  await nav.getByRole("button", { name: "Abrir menu da conta" }).click()
  await expect(nav.getByRole("link", { name: "Minha conta", exact: true })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Painel Admin", exact: true })).toHaveAttribute("href", "/admin")
  await expect(nav.getByRole("link", { name: "Sair", exact: true })).toHaveAttribute("href", "/api/auth/signout")
  await page.keyboard.press("Escape")
  await expect(nav.getByRole("button", { name: "Abrir menu da conta" })).toHaveAttribute("aria-expanded", "false")
  await page.screenshot({ path: "outputs/vitrine-identidade-brabus/g7-admin-depois.png" })
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(nav.getByRole("img", { name: "Brabu’s Performance Store", exact: true })).toBeVisible()
  expect(await nav.evaluate(el => el.scrollWidth - el.clientWidth)).toBe(0)
  await nav.getByRole("button", { name: "Abrir menu", exact: true }).press("Enter")
  await expect(nav.getByRole("button", { name: "Fechar menu", exact: true })).toHaveAttribute("aria-expanded", "true")
  await expect(nav.getByRole("link", { name: "Produtos", exact: true }).last()).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(nav.getByRole("button", { name: "Abrir menu", exact: true })).toHaveAttribute("aria-expanded", "false")
  await page.screenshot({ path: "outputs/vitrine-identidade-brabus/g7-admin-mobile.png" })
})
