import assert from "node:assert/strict"
import test from "node:test"
import { addItemAndNavigate, getAddToCartNavigation } from "../components/AddToCartButton"

test("navigates compact cards with a pending variant selection to the product", () => {
  assert.equal(
    getAddToCartNavigation({ redirectToCart: false, shouldRedirectToProduct: true, slug: "whey-protein" }),
    "/products/whey-protein",
  )
})

test("navigates product details to the cart after adding a valid item", () => {
  assert.equal(
    getAddToCartNavigation({ redirectToCart: true, shouldRedirectToProduct: false, slug: "whey-protein" }),
    "/cart",
  )
})

test("keeps compact cards on the current page after adding an item", () => {
  assert.equal(
    getAddToCartNavigation({ redirectToCart: false, shouldRedirectToProduct: false, slug: "whey-protein" }),
    null,
  )
})

test("adds the item before navigating to the cart", () => {
  const calls: string[] = []
  const item = { productId: "product-1" }

  addItemAndNavigate(
    () => calls.push("add"),
    item,
    "/cart",
    (route) => calls.push(`navigate:${route}`),
  )

  assert.deepEqual(calls, ["add", "navigate:/cart"])
})

test("does not navigate when the route is null", () => {
  const calls: string[] = []
  const item = { productId: "product-1" }

  addItemAndNavigate(
    () => calls.push("add"),
    item,
    null,
    (route) => calls.push(`navigate:${route}`),
  )

  assert.deepEqual(calls, ["add"])
})
