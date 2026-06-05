# Design Spec: Dashboard TASK-S1-DASH-08 e TASK-S1-DASH-09

**Data:** 2026-06-04
**Versao:** 1.0

---

## 1. Objetivo

Adicionar duas visualizacoes na aba `Comercial` da dashboard:
- **Produtos mais vendidos** — ranking por unidades vendidas
- **Top clientes** — ranking por faturamento com count de pedidos

---

## 2. TASK-S1-DASH-08 — Produtos mais vendidos

### Backend (`lib/admin-dashboard.ts`)

Nova secao `commercial.mostSoldProducts`:

```typescript
mostSoldProducts: Array<{
  productId: string
  name: string
  units: number
  revenue: number
  averageTicket: number // revenue / units
}>
```

Agregacao:
- Query em `OrderItem` via `paidOrderFilter`
- Group por `productId` + `productNameSnapshot`
- Soma `quantity` → `units`
- Soma `unitPrice * quantity` → `revenue`
- Calcular `averageTicket`
- Order: `units DESC`
- Limit: 10

### Frontend (`app/admin/page.tsx`)

Nova tabela `MostSoldProductsTable`:

| Coluna | Conteudo |
|--------|----------|
| Produto | nome do produto |
| Unidades | unidades vendidas (formatNumber) |
| Faturamento | receita total (formatCurrency) |
| Ticket Medio | averageTicket (formatCurrency) |

Estilo: igual a `FinancialTopProductsTable` existente.

---

## 3. TASK-S1-DASH-09 — Top clientes

### Backend (`lib/admin-dashboard.ts`)

Nova secao `commercial.topClients`:

```typescript
topClients: Array<{
  userId: string
  name: string
  orders: number
  revenue: number
  averageTicket: number
}>
```

Agregacao:
- Query em `Order` com `paidOrderFilter`
- Excluir user com email `pdv-balcao@brabus.local`
- Group por `userId`
- Count → `orders`
- Sum `total` → `revenue`
- Join com `User.name`
- Fallback: se User.name null → usar email antes do `@`
- Se User null → "Cliente sem identificacao"
- Order: `revenue DESC`
- Limit: 10

### Frontend (`app/admin/page.tsx`)

Nova tabela `TopClientsTable`:

| Coluna | Conteudo |
|--------|----------|
| Cliente | nome ou identificacao |
| Pedidos | count de pedidos (formatNumber) |
| Faturamento | receita total (formatCurrency) |
| Ticket Medio | averageTicket (formatCurrency) |

Estilo: mesmo pattern das outras tabelas da dashboard.

---

## 4. Estrutura de retorno

```typescript
commercial: {
  // existente
  cards: { salesTotal }
  paymentMethodSales
  categorySales
  subcategorySales
  channelSales

  // NOVO
  mostSoldProducts: [...] // 10 items
  topClients: [...] // 10 items
}
```

---

## 5. Arquivos afetados

- `lib/admin-dashboard.ts` — nova agregacao `clientSales` + integracao em `mostSoldProducts`
- `app/admin/page.tsx` — `MostSoldProductsTable` + `TopClientsTable`

---

## 6. Validacao

- Build passa (`npm run build`)
- Tabelas renderizam com dados reais
- Tabelas mostram placeholder quando sem dados