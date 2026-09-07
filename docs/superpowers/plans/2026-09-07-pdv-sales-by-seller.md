# Relatório de vendas PDV por vendedor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar no Dashboard Comercial o ranking de vendas PDV consolidadas por vendedor dentro do período selecionado.

**Architecture:** `lib/admin-dashboard.ts` ganhará uma agregação pura e testável que filtra canal, status e vínculo de vendedor antes de somar pedidos. O carregamento atual do Dashboard incluirá a relação mínima do vendedor, disponibilizará o ranking em `commercial`, e a página renderizará uma tabela no padrão de Top Clientes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 5, Node test runner.

## Global Constraints

- Não criar ou alterar schema, migrações, API ou registros históricos.
- Considerar somente pedidos `PDV`, com vendedor relacionado e status `PAID`, `SHIPPED` ou `DELIVERED`.
- Faturamento é a soma de `Order.total`; venda Fiado entra na venda, recebimento de título não entra.
- Manter o Dashboard restrito a `ADMIN` e respeitar seu seletor global de período.
- Executar em branch a ser definida na autorização de implementação; não editar código durante a etapa de planejamento.

---

### Task 1: Agregar e exibir vendas PDV por vendedor

**Files:**
- Modify: `lib/admin-dashboard.ts`
- Modify: `app/admin/page.tsx`
- Create: `tests/admin-dashboard.test.ts`

**Interfaces:**
- Produces: `aggregatePdvSalesBySeller(orders)` retornando `{ sellerId, name, orders, revenue, averageTicket }[]`, ordenado por `revenue` decrescente.
- Produces: `dashboard.commercial.salesBySeller` com o retorno da agregação.
- Consumes: objetos de pedido com `channel`, `status`, `total` e `seller` opcional.

- [x] **Step 1: Escrever testes para a regra comercial de vendedor**

```ts
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
```

- [x] **Step 2: Executar o teste para verificar o estado RED**

Run: `node --import tsx --test tests/admin-dashboard.test.ts`

Expected: FAIL com `aggregatePdvSalesBySeller is not a function` porque a agregação ainda não existe.

- [x] **Step 3: Implementar a agregação pura em `lib/admin-dashboard.ts`**

```ts
export function aggregatePdvSalesBySeller(orders: Array<{
  channel: OrderChannel
  status: OrderStatus
  total: { toNumber(): number } | number
  seller: { id: string; name: string } | null
}>) {
  const sales = new Map<string, { sellerId: string; name: string; orders: number; revenue: number }>()

  for (const order of orders) {
    if (order.channel !== OrderChannel.PDV || !paidStatuses.includes(order.status) || !order.seller) continue
    const current = sales.get(order.seller.id) ?? { sellerId: order.seller.id, name: order.seller.name, orders: 0, revenue: 0 }
    current.orders += 1
    current.revenue += decimalToNumber(order.total)
    sales.set(current.sellerId, current)
  }

  return Array.from(sales.values())
    .map((item) => ({ ...item, revenue: currencyValue(item.revenue), averageTicket: currencyValue(item.revenue / item.orders) }))
    .sort((left, right) => right.revenue - left.revenue)
}
```

- [x] **Step 4: Incluir os campos necessários na consulta e expor o retorno comercial**

```ts
const paidOrders = await prisma.order.findMany({
  where: paidOrderFilter,
  select: {
    total: true,
    createdAt: true,
    paymentMethod: true,
    channel: true,
    status: true,
    userId: true,
    seller: { select: { id: true, name: true } },
  },
})

const salesBySeller = aggregatePdvSalesBySeller(paidOrders)

commercial: {
  cards: { salesTotal: currencyValue(totalSales) },
  paymentMethodSales: aggregateCurrencyMap(paymentMethodSales),
  categorySales: aggregateCurrencyMap(categorySales).slice(0, 8),
  subcategorySales: aggregateCurrencyMap(subcategorySales).slice(0, 8),
  channelSales: aggregateCurrencyMap(channelSales),
  mostSoldProducts,
  topClients,
  salesBySeller,
}
```

- [x] **Step 5: Criar a tabela no padrão comercial existente em `app/admin/page.tsx`**

```tsx
function SalesBySellerTable({ items }: { items: ReadonlyArray<{ sellerId: string; name: string; orders: number; revenue: number; averageTicket: number }> }) {
  return (
    <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
      <div className="mb-6"><h3 className="text-lg font-heading tracking-wider uppercase text-white">Vendas por Vendedor</h3><p className="mt-2 text-sm text-gray-500">Ranking de vendas PDV atribuídas no período atual.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-black text-xs uppercase tracking-[0.2em] text-gray-400"><tr><th className="rounded-tl-sm px-4 py-4">Vendedor</th><th className="px-4 py-4">Pedidos</th><th className="px-4 py-4">Faturamento</th><th className="rounded-tr-sm px-4 py-4">Ticket Médio</th></tr></thead><tbody>{items.map((item) => <tr key={item.sellerId} className="border-b border-white/5 hover:bg-white/5"><td className="px-4 py-4 font-medium text-white">{item.name}</td><td className="px-4 py-4 text-gray-300">{formatNumber(item.orders)}</td><td className="px-4 py-4 text-gray-300">{formatCurrency(item.revenue)}</td><td className="px-4 py-4 font-semibold text-white">{formatCurrency(item.averageTicket)}</td></tr>)}{items.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">Nenhuma venda PDV atribuída a vendedor no período atual.</td></tr> : null}</tbody></table></div>
    </div>
  )
}

<MostSoldProductsTable items={dashboard.commercial.mostSoldProducts} />
<TopClientsTable items={dashboard.commercial.topClients} />
<SalesBySellerTable items={dashboard.commercial.salesBySeller} />
```

- [x] **Step 6: Executar o teste específico e a suíte completa para verificar o estado GREEN**

Run: `node --import tsx --test tests/admin-dashboard.test.ts && npm test`

Expected: PASS, com canal online, pedido pendente e pedido sem vendedor excluídos; os testes existentes de checkout, PDV e títulos também permanecem verdes.

- [x] **Step 7: Validar lint, build e integridade do diff**

Run: `npm run lint -- . && npm run build && git diff --check`

Expected: build aprovado e nenhum erro de lint introduzido.

- [x] **Step 8: Registrar a entrega**

```bash
git add lib/admin-dashboard.ts app/admin/page.tsx tests/admin-dashboard.test.ts docs/superpowers/plans/2026-09-07-pdv-sales-by-seller.md
git commit -m "feat: report PDV sales by seller"
```
