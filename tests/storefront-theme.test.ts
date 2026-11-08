import assert from "node:assert/strict"
import test from "node:test"
import { getBrandTheme } from "../lib/storefront-theme"

test("public store routes receive the storefront theme", () => {
  for (const path of ["/", "/products", "/products/isn-100-whey", "/loja", "/contato"]) {
    assert.equal(getBrandTheme(path), "storefront")
  }
})

test("PDV is classified separately without including other admin routes", () => {
  assert.equal(getBrandTheme("/admin/pdv"), "pdv")
  for (const path of ["/admin", "/admin/products", "/admin/pdv-other", "/auth/login", "/account", "/cart", "/products-other"]) {
    assert.equal(getBrandTheme(path), "legacy")
  }
})
