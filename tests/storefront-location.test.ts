import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import StoreLocation from "../components/storefront/StoreLocation"
import StoreContact from "../components/storefront/StoreContact"
import StorefrontFooter from "../components/storefront/StorefrontFooter"
import { getStoreMapLinks } from "../lib/store-location"

const settings = {
  addressStreet: "Rua de teste, 123", addressComplement: "Centro", addressCity: "Aracoiaba", addressState: "CE", addressZip: "62750-000",
  openingHours: "Horário configurado", whatsapp: "5585921002688", instagram: "@perfil_teste", instagramUrl: "https://instagram.com/perfil_teste",
  googleMapsUrl: null, googleMapsEmbed: null,
}

test("location presents configured address, correct zip and an accessible embedded map without a fake store photo", () => {
  const html = renderToStaticMarkup(createElement(StoreLocation, { settings }))
  assert.match(html, /62750-000/)
  assert.match(html, /Rua de teste, 123/)
  assert.match(html, /Horário configurado/)
  assert.match(html, /<iframe[^>]*title="Localização da Brabu’s Performance Store"/)
  assert.match(html, /loading="lazy"/)
  assert.match(html, /Abrir no Google Maps/)
  assert.doesNotMatch(html, /unsplash|Fachada|<img/)
})

test("map uses configured links and falls back to an encoded full address", () => {
  const links = getStoreMapLinks(settings)
  assert.match(decodeURIComponent(links.embed), /Rua de teste, 123/)
  assert.match(decodeURIComponent(links.embed), /62750-000/)
  const configured = getStoreMapLinks({ ...settings, googleMapsUrl: "https://maps.app.goo.gl/test", googleMapsEmbed: "https://www.google.com/maps/embed?pb=test" })
  assert.equal(configured.open, "https://maps.app.goo.gl/test")
  assert.equal(configured.embed, "https://www.google.com/maps/embed?pb=test")
  assert.match(getStoreMapLinks({ ...settings, googleMapsEmbed: "javascript:alert(1)", googleMapsUrl: "https://evil.example" }).embed, /^https:\/\/maps.google.com\//)
})

test("contact provides working configured channels instead of an inert send action", () => {
  const html = renderToStaticMarkup(createElement(StoreContact, { settings }))
  assert.match(html, /https:\/\/wa.me\/5585921002688/)
  assert.match(html, /https:\/\/instagram.com\/perfil_teste/)
  assert.match(html, /mailto:contato@brabusstore.com/)
  assert.doesNotMatch(html, /<form|Enviar Mensagem/)
})

test("footer uses the official signature and configured address and contacts", () => {
  const html = renderToStaticMarkup(createElement(StorefrontFooter, { settings }))
  assert.match(html, /logo-horizontal/)
  assert.match(html, /62750-000/)
  assert.match(html, /Rua de teste, 123/)
  assert.match(html, /aria-label="Instagram da Brabu’s"/)
  assert.match(html, /Moda masculina/)
})
