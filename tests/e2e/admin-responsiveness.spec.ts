import { expect, test } from "@playwright/test"
import {
  expectNoAdminHorizontalOverflow,
  expectPanelInsideAdmin,
  loginAsAdmin,
} from "./support/admin"

const pdvViewports = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1536x900", width: 1536, height: 900 },
] as const

const sidebarStates = ["recolhido", "expandido"] as const

for (const viewport of pdvViewports) {
  for (const sidebarState of sidebarStates) {
    test(`PDV não corta checkout em ${viewport.name} com sidebar ${sidebarState}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await loginAsAdmin(page, "/admin/pdv")
      await expect(page.getByRole("heading", { name: "PDV Balcão" })).toBeVisible()
      await expect(page.getByTestId("pdv-product-table-scroll")).toBeVisible()

      if (sidebarState === "expandido") {
        await page.getByRole("button", { name: "Expandir sidebar do admin" }).click()
      }

      await expectNoAdminHorizontalOverflow(page)
      await expectPanelInsideAdmin(page, "pdv-checkout-panel")
      await expect
        .poll(() => page.getByTestId("pdv-product-table-scroll").evaluate((element) => element.scrollWidth > element.clientWidth))
        .toBe(true)
    })
  }
}

const dashboardTabs = [
  { name: "Visão Geral", path: "/admin" },
  { name: "Financeiro", path: "/admin?tab=financial" },
  { name: "Comercial", path: "/admin?tab=commercial" },
  { name: "Estoque", path: "/admin?tab=stock" },
] as const

test("Dashboard mantém rolagem horizontal dentro dos próprios componentes", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await loginAsAdmin(page, "/admin")

  for (const tab of dashboardTabs) {
    await page.goto(tab.path)
    await expect(page.getByRole("link", { name: tab.name, exact: true })).toBeVisible()
    await expectNoAdminHorizontalOverflow(page)
  }
})
