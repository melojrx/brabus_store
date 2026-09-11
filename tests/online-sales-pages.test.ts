import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("legacy purchase pages render the unavailable component", async () => {
  for (const path of [
    "app/cart/page.tsx",
    "app/checkout/page.tsx",
    "app/checkout/success/page.tsx",
    "app/checkout/cancel/page.tsx",
  ]) {
    const source = await readFile(path, "utf8")
    assert.match(source, /OnlineSalesUnavailable/)
  }
})

test("navbar does not render the cart when online sales are disabled", async () => {
  const source = await readFile("components/Navbar.tsx", "utf8")
  assert.match(source, /onlineSalesEnabled/)
})

test("checkout middleware allows the PDV-only notice without authentication", async () => {
  const source = await readFile("proxy.ts", "utf8")
  assert.match(source, /isOnlineSalesEnabled\(\)/)
  assert.match(source, /!isLoggedIn && pathname\.startsWith\("\/checkout"\) && isOnlineSalesEnabled\(\)/)
})
