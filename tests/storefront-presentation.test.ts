import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import BrandLogo from "../components/brand/BrandLogo"
import StorefrontHero from "../components/storefront/StorefrontHero"
import StorefrontInfoStrip from "../components/storefront/StorefrontInfoStrip"

test("brand logo renders the local signature with an accessible name", () => {
  const html = renderToStaticMarkup(createElement(BrandLogo))
  assert.match(html, /alt="Brabu’s Performance Store"/)
  assert.match(html, /logo-horizontal/)
})

test("hero offers the existing categories and local emblem without delivery promises", () => {
  const html = renderToStaticMarkup(createElement(StorefrontHero))
  assert.match(html, /Para quem treina/)
  assert.match(html, /href="\/products\?category=suplementos"/)
  assert.match(html, /href="\/products\?category=roupas-fitness"/)
  assert.match(html, /Moda masculina/)
  assert.match(html, /emblema-principal/)
  assert.doesNotMatch(html, /24h|unsplash/)
})

test("information strip renders configured address and Instagram instead of fixed contacts", () => {
  const html = renderToStaticMarkup(createElement(StorefrontInfoStrip, {
    address: "Endereço configurado de teste",
    instagram: "@perfil_configurado",
    instagramUrl: "https://instagram.com/perfil_configurado",
  }))
  assert.match(html, /Endereço configurado de teste/)
  assert.match(html, /@perfil_configurado/)
  assert.match(html, /href="https:\/\/instagram.com\/perfil_configurado"/)
  assert.match(html, /Consulte a entrega para sua cidade/)
  assert.doesNotMatch(html, /24h|Antônio Lopes/)
})
