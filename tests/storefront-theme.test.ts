import assert from "node:assert/strict"
import test from "node:test"
import { getBrandTheme, isAdminPath } from "../lib/storefront-theme"

test("public store routes receive the storefront theme", () => {
  for (const path of ["/", "/products", "/products/isn-100-whey", "/loja", "/contato"]) {
    assert.equal(getBrandTheme(path), "storefront")
  }
})

test("PDV is classified separately without including other admin routes", () => {
  assert.equal(getBrandTheme("/admin/pdv"), "pdv")
  for (const path of ["/admin", "/admin/products", "/admin/pdv-other", "/products-other"]) {
    assert.equal(getBrandTheme(path), "legacy")
  }
})


test("admin header covers exact admin routes without expanding the body theme", () => {
  for (const path of ["/admin", "/admin/", "/admin/products", "/admin/settings", "/admin/pdv", "/admin/integrations/webhooks/test"]) {
    assert.equal(isAdminPath(path), true)
    assert.equal(getBrandTheme(path), path === "/admin/pdv" ? "pdv" : "legacy")
  }
  for (const path of ["/", "/administrator", "/admin-other", "/products", "/auth/login", "/account", "/cart"]) {
    assert.equal(isAdminPath(path), false)
  }
})


test("customer journeys share the storefront theme with strict route boundaries", () => {
  for (const path of ["/account", "/account/orders", "/account/orders/example", "/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password", "/cart", "/checkout", "/checkout/success", "/checkout/cancel"]) {
    assert.equal(getBrandTheme(path), "storefront", path)
  }
  for (const path of ["/account-other", "/checkout-other", "/cart-other", "/auth/unknown", "/auth/login-other", "/api/checkout", "/administrator"]) {
    assert.equal(getBrandTheme(path), "legacy", path)
  }
})
