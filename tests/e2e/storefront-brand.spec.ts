import { expect, test } from "@playwright/test"

for (const width of [375, 768, 1440]) {
  test(`approved storefront assets and navigation work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Para quem treina de verdade/)
    await expect(page.locator(".theme-storefront")).toHaveCSS("--color-primary", /#d4a346/i)
    for (const image of await page.locator('img[src^="/brand/"]').all()) {
      await image.scrollIntoViewIfNeeded()
      await expect(image).toBeVisible()
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    }
    await expect(page.locator(".storefront-category-card")).toHaveCount(3)
    await expect(page.locator(".storefront-product-card").first()).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
    const cta = page.getByRole("link", { name: "Ver suplementos", exact: true })
    await cta.focus()
    await expect(cta).toBeFocused()
    await expect(cta).toHaveCSS("outline-style", "solid")
    await expect(page.locator(".storefront-hero-atmosphere")).toHaveCSS("animation-name", "none")
    if (width === 375) {
      const menu = page.getByRole("button", { name: "Abrir menu", exact: true })
      await menu.focus()
      await page.keyboard.press("Enter")
      await expect(page.getByRole("button", { name: "Fechar menu", exact: true })).toHaveAttribute("aria-expanded", "true")
      await page.keyboard.press("Escape")
      await expect(menu).toHaveAttribute("aria-expanded", "false")
    }
    await cta.focus()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/products\?category=suplementos/)
    const product = page.locator(".storefront-product-card").first().getByRole("link").first()
    const productPath = await product.getAttribute("href")
    await product.click()
    await expect(page).toHaveURL(new RegExp(`${productPath}$`))
    await expect(page.locator(".theme-storefront")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
}
