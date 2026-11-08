import { expect, test } from "@playwright/test"
import { loginAsAdmin } from "./support/admin"

for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
  test(`location and contact preserve identity without overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    for (const path of ["/loja", "/contato"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await expect(page.locator(".brand-footer")).toContainText("62750-000")
      await expect(page.locator("main")).toContainText("62750-000")
      await expect(page.locator(".brand-footer").getByRole("img", { name: "Brabu’s Performance Store", exact: true })).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
    }
    await expect(page.locator("main form")).toHaveCount(0)
    await expect(page.locator("main").getByRole("link", { name: "contato@brabusstore.com" })).toHaveAttribute("href", "mailto:contato@brabusstore.com")
    await page.goto("/loja", { waitUntil: "domcontentloaded" })
    const map = page.getByTitle("Localização da Brabu’s Performance Store", { exact: true })
    await expect(map).toBeVisible()
    await expect(map).toHaveAttribute("loading", "lazy")
    await expect(map).toHaveAttribute("src", /google\.com\/maps\/embed\?pb=/)
    await expect(page.locator("main img")).toHaveCount(0)
    const boxes = await Promise.all([page.locator(".storefront-location-address").boundingBox(), map.boundingBox()])
    if (viewport.width < 768) expect(boxes[1]!.y).toBeGreaterThanOrEqual(boxes[0]!.y + boxes[0]!.height - 1)
    else expect(boxes[1]!.x).toBeGreaterThanOrEqual(boxes[0]!.x + boxes[0]!.width - 1)
  })
}

test("footer switches only on public routes and retains legacy PDV presentation", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator(".brand-footer")).toBeVisible()
  await loginAsAdmin(page, "/admin/pdv")
  await expect(page.locator(".brand-footer")).toHaveCount(0)
  await expect(page.locator(".theme-pdv")).toBeVisible()
})
