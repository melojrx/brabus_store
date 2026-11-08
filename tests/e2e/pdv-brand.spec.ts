import { expect, test } from "@playwright/test"
import { writeFile } from "node:fs/promises"
import { loginAsAdmin, expectNoAdminHorizontalOverflow, expectPanelInsideAdmin } from "./support/admin"

const viewports = [{ width: 1280, height: 800 }, { width: 1366, height: 768 }]

test("capture authenticated PDV baseline before brand activation", async ({ page }) => {
  test.skip(process.env.BRAND_BASELINE !== "true", "Baseline is captured only before implementation")
  await loginAsAdmin(page, "/admin/pdv")
  const measurements = []
  for (const side of ["recolhido", "expandido"]) {
    if (side === "expandido") await page.getByRole("button", { name: "Expandir sidebar do admin" }).click()
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await expectNoAdminHorizontalOverflow(page)
      await expectPanelInsideAdmin(page, "pdv-checkout-panel")
      measurements.push({ side, ...await page.evaluate(() => ({
        width: innerWidth, height: innerHeight,
        headerHeight: document.querySelector("nav")!.getBoundingClientRect().height,
        checkout: document.querySelector('[data-testid="pdv-checkout-panel"]')!.getBoundingClientRect().toJSON(),
        font: getComputedStyle(document.querySelector('[data-testid="admin-main"]')!).fontFamily,
      })) })
      await page.screenshot({ path: `outputs/vitrine-identidade-brabus/g4-antes-${viewport.width}-${side}.jpg` })
    }
  }
  await writeFile("outputs/vitrine-identidade-brabus/g4-baseline-geometria.json", JSON.stringify(measurements, null, 2))
})

test("PDV and admin headers share branding while dashboard content keeps legacy theme", async ({ page }) => {
  await page.setViewportSize(viewports[1])
  await loginAsAdmin(page, "/admin/pdv")
  const navbar = page.getByRole("navigation").first()
  await expect(navbar.getByRole("img", { name: "Brabu’s Performance Store", exact: true })).toBeVisible()
  await expect(page.locator(".theme-pdv")).toHaveCSS("--color-primary", /#d4a346/i)
  await expectNoAdminHorizontalOverflow(page)
  await expectPanelInsideAdmin(page, "pdv-checkout-panel")
  await expect(navbar).toHaveCSS("height", "74px")
  await page.goto("/admin")
  await expect(page.locator(".theme-pdv")).toHaveCount(0)
  expect((await page.getByTestId("admin-main").evaluate(el => getComputedStyle(el).getPropertyValue("--color-primary"))).trim().toUpperCase()).toBe("#C9A84C")
  await expect(navbar.getByRole("img", { name: "Brabu’s Performance Store", exact: true })).toBeVisible()
  await expect(navbar).toHaveCSS("--color-primary", /#d4a346/i)
})


test("PDV retains product quantity, discount, customer and payment controls", async ({ page }) => {
  await page.setViewportSize(viewports[1])
  await loginAsAdmin(page, "/admin/pdv")
  const row = page.getByRole("row").filter({ hasText: "Creatina Monohidratada 300g" })
  await row.getByRole("button", { name: /Padrão/ }).click()
  await row.getByRole("button", { name: /Padrão/ }).click()
  const checkout = page.getByTestId("pdv-checkout-panel")
  await expect(checkout).toContainText(/99,80/)
  await checkout.getByPlaceholder("R$ 0,00").first().fill("500")
  await expect(checkout).toContainText(/94,80/)
  await checkout.getByRole("button", { name: /Incluir Cliente/i }).click()
  await expect(checkout.getByPlaceholder("Nome, e-mail ou telefone")).toBeVisible()
  const payment = checkout.locator("select").filter({ has: page.locator('option[value="FIADO"]') })
  for (const method of ["MANUAL_PIX", "POS_DEBIT", "POS_CREDIT", "CASH", "FIADO"]) {
    await payment.selectOption(method)
    await expect(payment).toHaveValue(method)
  }
  await expect(checkout.getByText("Pendente — a receber do cliente", { exact: true })).toBeVisible()
  await expect(checkout.getByRole("button", { name: /Criar pedido presencial/i })).toBeDisabled()
})
