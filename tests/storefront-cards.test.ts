import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ObjectiveCategories from "../components/storefront/ObjectiveCategories"
import ProductCard from "../components/storefront/ProductCard"

const product = { slug: "whey-teste", name: "Whey de teste", price: 129.9, stock: 20, images: ["/uploads/whey.jpg"], category: { name: "Suplementos" }, isNew: true }

test("categories use curated male, cap and supplement assets while preserving catalog routes", () => {
  const html = renderToStaticMarkup(createElement(ObjectiveCategories, { categories: [
    { id: "1", slug: "roupas-fitness", title: "Roupas fitness", href: "/products?category=roupas-fitness", description: "" },
    { id: "2", slug: "acessorios", title: "Acessórios", href: "/products?category=acessorios", description: "" },
    { id: "3", slug: "suplementos", title: "Suplementos", href: "/products?category=suplementos", description: "" },
  ] }))
  assert.match(html, /Moda masculina/)
  for (const name of ["masculina", "acessorios", "suplementos"]) assert.match(html, new RegExp(`categoria-${name}\\.webp`))
  assert.match(html, /href="\/products\?category=roupas-fitness"/)
  assert.match(html, /Bonés/)
  assert.doesNotMatch(html, /unsplash|group-hover:opacity/)
})

test("unknown category keeps its own name with a neutral fallback", () => {
  const html = renderToStaticMarkup(createElement(ObjectiveCategories, { categories: [{ id: "4", slug: "outros", title: "Outros", href: "/products?category=outros", description: "Produtos desta categoria" }] }))
  assert.match(html, /Outros/)
  assert.match(html, /Produtos desta categoria/)
  assert.doesNotMatch(html, /<img/)
})

test("product exposes image and name links, price and a separate action", () => {
  const html = renderToStaticMarkup(createElement(ProductCard, { product, action: createElement("button", {}, "Comprar") }))
  assert.equal((html.match(/href="\/products\/whey-teste"/g) ?? []).length, 2)
  assert.match(html, /alt="Whey de teste"/)
  assert.match(html, /loading="lazy"/)
  assert.match(html, /R\$ 129,90/)
  assert.match(html, /Novo/)
  assert.match(html, /<button>Comprar<\/button>/)
  assert.ok(html.indexOf("storefront-product-content") > html.indexOf("storefront-product-media"))
  assert.ok(html.lastIndexOf("</a>") < html.indexOf("<button>"))
})

test("stock badges take priority over new and missing image has an explicit fallback", () => {
  for (const [stock, badge] of [[0, "Esgotado"], [3, "Últimas unidades"]] as const) {
    const html = renderToStaticMarkup(createElement(ProductCard, { product: { ...product, stock, images: [] } }))
    assert.match(html, new RegExp(badge))
    assert.match(html, /Imagem indisponível/)
    assert.doesNotMatch(html, /Novo|<img|placeholder.jpg/)
  }
})

test("legacy placeholder path is presented as a missing photo", () => {
  const html = renderToStaticMarkup(createElement(ProductCard, { product: { ...product, images: ["/placeholder.jpg"] } }))
  assert.match(html, /Imagem indisponível/)
  assert.doesNotMatch(html, /<img/)
})
