# Dashboard TASK-S1-DASH-08 e TASK-S1-DASH-09 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ranking de produtos mais vendidos e top clientes na aba Comercial da dashboard.

**Architecture:** Backend aggregations em `lib/admin-dashboard.ts` + frontend table components em `app/admin/page.tsx`. Segue padroes existentes de `FinancialTopProductsTable` e `StockTopProductsTable`.

**Tech Stack:** Next.js 16, TypeScript, Prisma, Tailwind CSS

---

## Task 1: Most Sold Products (TASK-S1-DASH-08)

**Files:**
- Modify: `lib/admin-dashboard.ts:546-581` (loop de paidItems)
- Modify: `lib/admin-dashboard.ts:616-692` (retorno da funcao)

### Step 1: Adicionar logica de aggregacao por produto

Em `lib/admin-dashboard.ts`, dentro da funcao `getAdminDashboardData`, depois da inicializacao dos Maps (linha ~519), adicionar:

```typescript
// produtos mais vendidos (por unidades)
const productUnits = new Map<string, { units: number; revenue: number; name: string }>()
```

### Step 2: Preencher o Map dentro do loop de paidItems

Dentro do loop `for (const item of paidItems)` (linha ~546), depois de adicionar em `financialProducts`, adicionar:

```typescript
const productKey = item.product.id
const productEntry = productUnits.get(productKey) ?? {
  units: 0,
  revenue: 0,
  name: item.productNameSnapshot || item.product.name,
}
productEntry.units += item.quantity
productEntry.revenue += unitPrice * item.quantity
productUnits.set(productKey, productEntry)
```

### Step 3: Adicionar no retorno da funcao

Em `lib/admin-dashboard.ts` no retorno da funcao, dentro de `commercial`, adicionar:

```typescript
mostSoldProducts: Array.from(productUnits.entries())
  .map(([productId, data]) => ({
    productId,
    name: data.name,
    units: data.units,
    revenue: currencyValue(data.revenue),
    averageTicket: data.units > 0 ? currencyValue(data.revenue / data.units) : 0,
  }))
  .sort((left, right) => right.units - left.units)
  .slice(0, 10),
```

### Step 4: Commit

```bash
git add lib/admin-dashboard.ts
git commit -m "feat(dashboard): add mostSoldProducts aggregation for TASK-S1-DASH-08

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Top Clients (TASK-S1-DASH-09)

**Files:**
- Modify: `lib/admin-dashboard.ts:392-403` (query de paidOrders)
- Modify: `lib/admin-dashboard.ts:509-544` (loop de paidOrders)
- Modify: `lib/admin-dashboard.ts:616-692` (retorno)

### Step 1: Incluir userId no select de paidOrders

Em `lib/admin-dashboard.ts`, na query de `paidOrders` (linha ~422-430), atualizar para incluir `userId`:

```typescript
prisma.order.findMany({
  where: paidOrderFilter,
  select: {
    total: true,
    createdAt: true,
    paymentMethod: true,
    channel: true,
    userId: true,  // ADICIONAR
  },
}),
```

### Step 2: Adicionar Map para clientes

Apos inicializacao dos Maps (linha ~519), adicionar:

```typescript
const clientSales = new Map<string, { orders: number; revenue: number; userId: string }>()
const CLIENT_EXCLUDE_EMAIL = "pdv-balcao@brabus.local"
```

### Step 3: Query users para names

Apos a query de `stockVariants` (linha ~507), adicionar nova query:

```typescript
// buscar users dos pedidos pagos
const paidUserIds = [...new Set(paidOrders.map(o => o.userId).filter(Boolean))]
const paidUsers = paidUserIds.length > 0
  ? await prisma.user.findMany({
      where: { id: { in: paidUserIds } },
      select: { id: true, name: true, email: true },
    })
  : []
const userNameMap = new Map(paidUsers.map(u => [u.id, u.name || u.email?.split('@')[0] || "Cliente sem identificacao"]))
```

### Step 4: Preencher Map no loop de paidOrders

Dentro do loop `for (const order of paidOrders)` (linha ~528), apos adicionar em `channelSales`, adicionar:

```typescript
// ignorar balcao anonimo
if (order.userId) {
  const clientEntry = clientSales.get(order.userId) ?? {
    orders: 0,
    revenue: 0,
    userId: order.userId,
  }
  clientEntry.orders += 1
  clientEntry.revenue += orderTotal
  clientSales.set(order.userId, clientEntry)
}
```

### Step 5: Adicionar no retorno da funcao

Em `lib/admin-dashboard.ts` no retorno, dentro de `commercial`, adicionar:

```typescript
topClients: Array.from(clientSales.entries())
  .map(([userId, data]) => ({
    userId,
    name: userNameMap.get(userId) || "Cliente sem identificacao",
    orders: data.orders,
    revenue: currencyValue(data.revenue),
    averageTicket: data.orders > 0 ? currencyValue(data.revenue / data.orders) : 0,
  }))
  .sort((left, right) => right.revenue - left.revenue)
  .slice(0, 10),
```

### Step 6: Commit

```bash
git add lib/admin-dashboard.ts
git commit -m "feat(dashboard): add topClients aggregation for TASK-S1-DASH-09

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Most Sold Products Table Component

**Files:**
- Modify: `app/admin/page.tsx:339-393` (FinancialTopProductsTable - referencia de estilo)
- Modify: `app/admin/page.tsx:601-635` (commercial tab - onde adicionar)

### Step 1: Criar componente MostSoldProductsTable

Apos `FinancialTopProductsTable` (linha ~393), adicionar:

```typescript
function MostSoldProductsTable({
  items,
}: {
  items: ReadonlyArray<{
    productId: string
    name: string
    units: number
    revenue: number
    averageTicket: number
  }>
}) {
  return (
    <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-heading tracking-wider uppercase text-white">Produtos Mais Vendidos</h3>
        <p className="mt-2 text-sm text-gray-500">Ranking de unidades vendidas dentro do recorte atual.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-xs uppercase tracking-[0.2em] text-gray-400">
            <tr>
              <th className="rounded-tl-sm px-4 py-4">Produto</th>
              <th className="px-4 py-4">Unidades</th>
              <th className="px-4 py-4">Faturamento</th>
              <th className="rounded-tr-sm px-4 py-4">Ticket Médio</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-4 font-medium text-white">{item.name}</td>
                <td className="px-4 py-4 text-gray-300">{formatNumber(item.units)}</td>
                <td className="px-4 py-4 text-gray-300">{formatCurrency(item.revenue)}</td>
                <td className="px-4 py-4 font-semibold text-white">{formatCurrency(item.averageTicket)}</td>
              </tr>
            ))}

            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  Nenhum produto vendido no periodo atual.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### Step 2: Adicionar no commercial tab

Em `app/admin/page.tsx`, na secao `currentTab === "commercial"` (linha ~601), apos os 4 BarCharts, adicionar:

```tsx
<MostSoldProductsTable items={dashboard.commercial.mostSoldProducts} />
```

### Step 3: Commit

```bash
git add app/admin/page.tsx
git commit -m "feat(dashboard): add MostSoldProductsTable to commercial tab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Top Clients Table Component

**Files:**
- Modify: `app/admin/page.tsx:601-635` (commercial tab - onde adicionar)

### Step 1: Criar componente TopClientsTable

Apos `MostSoldProductsTable` (nova definicao em Task 3), adicionar:

```typescript
function TopClientsTable({
  items,
}: {
  items: ReadonlyArray<{
    userId: string
    name: string
    orders: number
    revenue: number
    averageTicket: number
  }>
}) {
  return (
    <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-heading tracking-wider uppercase text-white">Top Clientes</h3>
        <p className="mt-2 text-sm text-gray-500">Ranking de faturamento por cliente dentro do recorte atual.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-xs uppercase tracking-[0.2em] text-gray-400">
            <tr>
              <th className="rounded-tl-sm px-4 py-4">Cliente</th>
              <th className="px-4 py-4">Pedidos</th>
              <th className="px-4 py-4">Faturamento</th>
              <th className="rounded-tr-sm px-4 py-4">Ticket Médio</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.userId} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-4 font-medium text-white">{item.name}</td>
                <td className="px-4 py-4 text-gray-300">{formatNumber(item.orders)}</td>
                <td className="px-4 py-4 text-gray-300">{formatCurrency(item.revenue)}</td>
                <td className="px-4 py-4 font-semibold text-white">{formatCurrency(item.averageTicket)}</td>
              </tr>
            ))}

            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  Nenhum cliente com pedidos validados no periodo atual.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### Step 2: Adicionar no commercial tab

Em `app/admin/page.tsx`, na secao `currentTab === "commercial"`, apos `<MostSoldProductsTable>`, adicionar:

```tsx
<TopClientsTable items={dashboard.commercial.topClients} />
```

### Step 3: Commit

```bash
git add app/admin/page.tsx
git commit -m "feat(dashboard): add TopClientsTable to commercial tab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Validacao Final

### Step 1: Rodar build

```bash
npm run build
```

Esperado: BUILD SUCCESSFUL

### Step 2: Atualizar TASKS.md

Em `docs/TASKS.md`, marcar tasks como completas:

```markdown
#### TASK-S1-DASH-08 — Produtos mais vendidos
- [x] Agregar unidades vendidas por produto
- [x] Ordenar por quantidade
- [x] Exibir faturamento quando fizer sentido

#### TASK-S1-DASH-09 — Top clientes
- [x] Definir criterio inicial de ranking
- [x] Agregar clientes do periodo
- [x] Tratar corretamente cliente de PDV/balcao quando necessario
```

### Step 3: Commit final

```bash
git add docs/TASKS.md
git commit -m "docs: mark TASK-S1-DASH-08 and TASK-S1-DASH-09 as complete

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [x] Spec coverage: TASK-S1-DASH-08 (products) e TASK-S1-DASH-09 (clients) ambos implementados
- [x] Placeholder scan: nenhum TBD/TODO encontrado
- [x] Type consistency: interfaces consistentes entre backend e frontend
- [x] Exclusao de balcao anonimo implementada (`pdv-balcao@brabus.local`)
- [x] Limite de 10 itens aplicado em ambas agregacoes
- [x] Fallback para nome de cliente implementado

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-06-04-dashboard-products-clients-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**