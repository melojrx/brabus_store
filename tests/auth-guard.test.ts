import assert from "node:assert/strict"
import test from "node:test"
import { isAdminRole, isStaffRole } from "../lib/auth-guard"

test("separa administrador de acesso geral de equipe", () => {
  assert.equal(isAdminRole("ADMIN"), true)
  assert.equal(isAdminRole("SELLER"), false)
  assert.equal(isAdminRole("CUSTOMER"), false)
  assert.equal(isStaffRole("SELLER"), true)
})
