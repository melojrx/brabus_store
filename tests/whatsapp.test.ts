import assert from "node:assert/strict"
import test from "node:test"
import { buildWhatsAppUrl } from "../lib/whatsapp"

test("builds a WhatsApp URL from StoreSettings digits and contextual message", () => {
  assert.equal(
    buildWhatsAppUrl("(85) 99783-9040", "Olá! Tenho interesse em Whey Pro."),
    "https://wa.me/5585997839040?text=Ol%C3%A1%21+Tenho+interesse+em+Whey+Pro.",
  )
})
