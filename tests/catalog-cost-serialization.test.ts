import assert from "node:assert/strict"
import test from "node:test"
import { Prisma } from "@prisma/client"
import { serializeProduct } from "../lib/catalog-api"

const date = new Date("2026-10-10T12:00:00Z")
const category = { id: "category", name: "Synthetic", slug: "synthetic", icon: null, active: true, sortOrder: 0, supportsSize: false, supportsColor: false, supportsFlavor: false, supportsWeight: false, trackStockByVariant: false, trackExpiration: false, createdAt: date, updatedAt: date, parentId: null, parent: null }
const product: Parameters<typeof serializeProduct>[0] = {
  id: "synthetic", name: "Synthetic", slug: "synthetic", description: "Synthetic product", price: new Prisma.Decimal(149.99), costPrice: new Prisma.Decimal(73.19), images: [], featured: false, active: true, isNew: true, weight: null, weightLabel: null, weightKg: null, gender: null, createdAt: date, updatedAt: date, categoryId: category.id, category,
  variants: [{ id: "variant", productId: "synthetic", sku: null, name: "Default", size: null, color: null, flavor: null, stock: 5, expiresAt: null, active: true, createdAt: date, updatedAt: date }],
}

test("default and unauthorized serialization omit cost without changing commercial fields", () => {
  for (const result of [serializeProduct(product), serializeProduct(product, { includeCosts: false })]) {
    assert.equal(Object.hasOwn(result, "costPrice"), false)
    assert.equal(JSON.stringify(result).includes("73.19"), false)
    assert.equal(result.price, 149.99)
    assert.equal(result.stock, 5)
    assert.equal(result.variants[0].id, "variant")
    assert.equal(result.createdAt, date.toISOString())
  }
})

test("explicit authorization serializes known, zero and absent costs", () => {
  for (const value of [73.19, 0, null]) {
    const result = serializeProduct({ ...product, costPrice: value == null ? null : new Prisma.Decimal(value) }, { includeCosts: true })
    assert.equal(result.costPrice, value)
  }
})
