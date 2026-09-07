import assert from "node:assert/strict"
import test from "node:test"
import { OrderChannel, OrderStatus } from "@prisma/client"
import { aggregatePdvSalesBySeller } from "../lib/admin-dashboard"

test("aggregates only eligible PDV sales by seller", () => {
  const result = aggregatePdvSalesBySeller([
    { channel: OrderChannel.PDV, status: OrderStatus.DELIVERED, total: 100, seller: { id: "seller-a", name: "Ana" } },
    { channel: OrderChannel.PDV, status: OrderStatus.PAID, total: 50, seller: { id: "seller-a", name: "Ana" } },
    { channel: OrderChannel.ONLINE, status: OrderStatus.PAID, total: 999, seller: { id: "seller-a", name: "Ana" } },
    { channel: OrderChannel.PDV, status: OrderStatus.PENDING, total: 999, seller: { id: "seller-b", name: "Bruno" } },
    { channel: OrderChannel.PDV, status: OrderStatus.DELIVERED, total: 999, seller: null },
  ])

  assert.deepEqual(result, [{ sellerId: "seller-a", name: "Ana", orders: 2, revenue: 150, averageTicket: 75 }])
})

test("sorts seller sales by revenue", () => {
  const result = aggregatePdvSalesBySeller([
    { channel: OrderChannel.PDV, status: OrderStatus.DELIVERED, total: 80, seller: { id: "seller-a", name: "Ana" } },
    { channel: OrderChannel.PDV, status: OrderStatus.DELIVERED, total: 100, seller: { id: "seller-b", name: "Bruno" } },
  ])

  assert.deepEqual(result.map((item) => item.sellerId), ["seller-b", "seller-a"])
})
