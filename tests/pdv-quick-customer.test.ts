import assert from "node:assert/strict"
import test from "node:test"
import { buildQuickPdvCustomerInput, canQuickRegisterPdvCustomer } from "../lib/pdv"

test("builds the minimum customer payload from PDV fields", () => {
  assert.deepEqual(
    buildQuickPdvCustomerInput({ name: " Ana ", phone: " (85) 99999-0000 ", email: " " }),
    { name: "Ana", phone: "(85) 99999-0000", email: null },
  )
})

test("requires name and phone for quick registration", () => {
  assert.throws(
    () => buildQuickPdvCustomerInput({ name: "Ana", phone: "", email: "" }),
    /nome e telefone/i,
  )
})

test("allows quick registration only with manual name and phone", () => {
  assert.equal(canQuickRegisterPdvCustomer({ selectedCustomerId: null, name: "Ana", phone: "85999990000" }), true)
  assert.equal(canQuickRegisterPdvCustomer({ selectedCustomerId: "customer-1", name: "Ana", phone: "85999990000" }), false)
})
