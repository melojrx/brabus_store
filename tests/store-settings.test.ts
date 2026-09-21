import assert from "node:assert/strict"
import test from "node:test"
import { DEFAULT_STORE_WHATSAPP, formatStoreWhatsApp } from "../lib/store-settings"

test("uses the new store WhatsApp fallback", () => {
  assert.equal(DEFAULT_STORE_WHATSAPP, "5585921002688")
})

test("formats the store WhatsApp for Brazilian display", () => {
  assert.equal(formatStoreWhatsApp("5585921002688"), "(85) 92100-2688")
})
