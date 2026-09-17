import assert from "node:assert/strict"
import test from "node:test"
import { resolvePostLoginDestination } from "../lib/post-login-destination"

test("leva vendedor ao PDV independentemente do destino informado", () => {
  assert.equal(resolvePostLoginDestination("SELLER", null), "/admin/pdv")
  assert.equal(resolvePostLoginDestination("SELLER", "/admin"), "/admin/pdv")
  assert.equal(resolvePostLoginDestination("SELLER", "/checkout"), "/admin/pdv")
})

test("mantém destinos internos válidos para administrador e cliente", () => {
  assert.equal(resolvePostLoginDestination("ADMIN", null), "/admin")
  assert.equal(resolvePostLoginDestination("ADMIN", "/admin/orders?page=2"), "/admin/orders?page=2")
  assert.equal(resolvePostLoginDestination("CUSTOMER", "/checkout"), "/checkout")
  assert.equal(resolvePostLoginDestination("CUSTOMER", null), "/")
})

test("descarta retornos externos e páginas de autenticação", () => {
  assert.equal(resolvePostLoginDestination("ADMIN", "https://example.com"), "/admin")
  assert.equal(resolvePostLoginDestination("CUSTOMER", "//example.com"), "/")
  assert.equal(resolvePostLoginDestination("CUSTOMER", "/auth/login"), "/")
})
