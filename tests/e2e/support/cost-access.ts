import { PrismaClient, type Role } from "@prisma/client"
import { hash } from "bcryptjs"
import { expect, type Page } from "@playwright/test"
import { hashApiKey } from "../../../lib/integrations/auth"

const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://missing")
if (!["localhost", "127.0.0.1"].includes(databaseUrl.hostname) || !databaseUrl.pathname.endsWith("_e2e")) {
  throw new Error("Cost access tests require a local synthetic _e2e database.")
}

export const costTestDb = new PrismaClient()
export const syntheticPassword = "Synthetic@123"

export async function createCostFixture() {
  const prefix = `cost-access-${crypto.randomUUID()}`
  const parent = await costTestDb.category.create({ data: { name: prefix, slug: `${prefix}-parent` } })
  const category = await costTestDb.category.create({ data: { name: `${prefix}-child`, slug: `${prefix}-child`, parentId: parent.id } })
  const product = await costTestDb.product.create({
    data: { name: prefix, slug: prefix, description: "Synthetic catalog fixture", price: 149.99, costPrice: 73.19, images: [], featured: true, categoryId: category.id, variants: { create: { name: "Default", stock: 25 } } },
    include: { variants: true },
  })
  const password = await hash(syntheticPassword, 4)
  const users = await Promise.all((["ADMIN", "SELLER", "CUSTOMER"] as Role[]).map(role => costTestDb.user.create({ data: { name: `${prefix}-${role}`, email: `${prefix}-${role.toLowerCase()}@example.test`, role, password } })))
  const [admin, seller, customer] = users
  const order = await costTestDb.order.create({
    data: { userId: customer.id, shippingType: "PICKUP", total: 149.99, status: "PAID", paymentStatus: "PAID", paymentMethod: "CASH", channel: "PDV", items: { create: { productId: product.id, productVariantId: product.variants[0].id, quantity: 1, price: 149.99, unitPrice: 149.99, unitCost: 73.19 } } },
  })
  return { prefix, parent, category, product, admin, seller, customer, order }
}

export type CostFixture = Awaited<ReturnType<typeof createCostFixture>>

export async function cleanupCostFixture(fixture: CostFixture) {
  const products = await costTestDb.product.findMany({ where: { slug: { startsWith: fixture.prefix } }, select: { id: true } })
  const ids = products.map(product => product.id)
  const orders = await costTestDb.order.findMany({ where: { items: { some: { productId: { in: ids } } } }, select: { id: true } })
  await costTestDb.orderItem.deleteMany({ where: { orderId: { in: orders.map(order => order.id) } } })
  await costTestDb.order.deleteMany({ where: { id: { in: orders.map(order => order.id) } } })
  await costTestDb.productVariant.deleteMany({ where: { productId: { in: ids } } })
  await costTestDb.product.deleteMany({ where: { id: { in: ids } } })
  await costTestDb.seller.deleteMany({ where: { user: { email: { startsWith: fixture.prefix } } } })
  await costTestDb.user.deleteMany({ where: { email: { startsWith: fixture.prefix } } })
  await costTestDb.category.delete({ where: { id: fixture.category.id } })
  await costTestDb.category.delete({ where: { id: fixture.parent.id } })
  const keys = await costTestDb.integrationApiKey.findMany({ where: { name: { startsWith: fixture.prefix } }, select: { id: true } })
  await costTestDb.integrationAuditLog.deleteMany({ where: { apiKeyId: { in: keys.map(key => key.id) } } })
  await costTestDb.integrationApiKey.deleteMany({ where: { name: { startsWith: fixture.prefix } } })
}

export function productPayload(fixture: CostFixture) {
  return { name: fixture.product.name, slug: fixture.product.slug, description: fixture.product.description, price: 149.99, categoryId: fixture.category.id, images: [], variants: [{ id: fixture.product.variants[0].id, name: "Default", stock: 25, active: true }] }
}

export async function loginCostUser(page: Page, email: string) {
  await page.goto("/auth/login")
  await page.getByPlaceholder("seu@email.com").fill(email)
  await page.getByPlaceholder("••••••••").fill(syntheticPassword)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/)
}

export async function createCostKey(fixture: CostFixture, scopes: string[]) {
  const token = `synthetic-${crypto.randomUUID()}`
  const key = await costTestDb.integrationApiKey.create({ data: { name: `${fixture.prefix}-${crypto.randomUUID()}`, actor: fixture.prefix, keyHash: hashApiKey(token), scopes } })
  return { key, headers: { Authorization: `Bearer ${token}` } }
}
