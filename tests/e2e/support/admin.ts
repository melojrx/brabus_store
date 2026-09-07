import { expect, type Page } from "@playwright/test"

export async function loginAsAdmin(page: Page, callbackPath: string) {
  await page.goto(`/auth/login?callbackUrl=${encodeURIComponent(callbackPath)}`)
  await page.getByPlaceholder("seu@email.com").fill("admin@brabus.com")
  await page.getByPlaceholder("••••••••").fill("Admin@123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL(new RegExp(`${callbackPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`))
}

export async function expectNoAdminHorizontalOverflow(page: Page) {
  const adminMain = page.getByTestId("admin-main")

  await expect(adminMain).toBeVisible()
  await expect.poll(() => adminMain.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0)
}

export async function expectPanelInsideAdmin(page: Page, testId: string) {
  const [adminBox, panelBox] = await Promise.all([
    page.getByTestId("admin-main").boundingBox(),
    page.getByTestId(testId).boundingBox(),
  ])

  expect(adminBox).not.toBeNull()
  expect(panelBox).not.toBeNull()
  expect(panelBox!.x).toBeGreaterThanOrEqual(adminBox!.x - 1)
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(adminBox!.x + adminBox!.width + 1)
}
