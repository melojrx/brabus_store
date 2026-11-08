import { expect, test } from "@playwright/test"

test("new icon metadata and files load in the storefront", async ({ page, request }) => {
  await page.goto("/")
  await expect(page.locator('link[rel="icon"][sizes="16x16"]')).toHaveAttribute("href", "/brand/icons/brabus-g10-16.png")
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/brand/icons/brabus-g10-180.png")
  const response = await request.get("/manifest.webmanifest")
  const manifest = await response.json()
  for (const icon of manifest.icons) {
    const image = await request.get(icon.src)
    expect(image.ok()).toBeTruthy()
    expect(image.headers()["content-type"]).toContain("image/png")
    const bytes = await image.body()
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes)
  }
})

test("service worker replaces old brand cache and retains unrelated caches", async ({ page }) => {
  await page.goto("/offline.html")
  await page.evaluate(async () => {
    await caches.open("brabus-store-pwa-v1")
    await caches.open("unrelated-cache")
    await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    await navigator.serviceWorker.ready
  })
  await expect.poll(() => page.evaluate(() => caches.keys())).toContain("brabus-store-pwa-g10")
  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain("brabus-store-pwa-v1")
  expect(await page.evaluate(() => caches.keys())).toContain("unrelated-cache")
  expect(await page.evaluate(async () => Boolean(await (await caches.open("brabus-store-pwa-g10")).match("/brand/icons/brabus-g10-32.png")))).toBeTruthy()
})
