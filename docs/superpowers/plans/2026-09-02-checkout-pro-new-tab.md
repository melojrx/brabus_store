# Checkout Pro em Nova Aba Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manter a Brabus aberta durante o Checkout Pro e levar o cliente ao acompanhamento local do pedido.

**Architecture:** O cliente abre o `initPoint` em uma nova aba iniciada no clique e navega a aba Brabus para a confirmação local. A confirmação continua sendo responsabilidade do webhook; a confirmação exibe fallback para popup bloqueado e a conta separa pagamento do estado operacional.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, Prisma, Mercado Pago Checkout Pro.

---

### Task 1: Abrir Checkout Pro sem perder a Brabus

**Files:**
- Modify: `app/checkout/CheckoutPageClient.tsx`
- Test: `tests/checkout-pro-navigation.test.ts`

- [ ] **Step 1: Escrever o teste de navegação desejada**

```ts
test("opens Mercado Pago in a new tab and keeps the local order URL", () => {
  assert.deepEqual(getCheckoutProNavigation("https://mp.example/pay", "order_123"), {
    paymentUrl: "https://mp.example/pay",
    trackingUrl: "/checkout/success?order_id=order_123",
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `node --import tsx --test tests/checkout-pro-navigation.test.ts`

Expected: FAIL porque `getCheckoutProNavigation` não existe.

- [ ] **Step 3: Implementar helper e fluxo de popup**

```ts
export function getCheckoutProNavigation(initPoint: string, orderId: string) {
  return { paymentUrl: initPoint, trackingUrl: `/checkout/success?order_id=${orderId}` }
}

const checkoutWindow = window.open(data.initPoint, "_blank", "noopener,noreferrer")
sessionStorage.setItem(`checkout-payment:${data.orderId}`, data.initPoint)
router.push(`/checkout/success?order_id=${data.orderId}`)
```

Mostrar um link `Abrir pagamento seguro` na confirmação apenas quando houver `sessionStorage` para o pedido; remover a chave ao abrir o link.

- [ ] **Step 4: Rodar teste e lint**

Run: `node --import tsx --test tests/checkout-pro-navigation.test.ts && npm run lint -- app/checkout/CheckoutPageClient.tsx`

Expected: PASS.

### Task 2: Acompanhar pagamento e pedido na conta

**Files:**
- Modify: `app/checkout/success/page.tsx`
- Modify: `app/account/orders/page.tsx`
- Modify: `app/account/orders/[id]/page.tsx`

- [ ] **Step 1: Exibir link de fallback e detalhe local na confirmação**

Na confirmação, ler o fallback em `sessionStorage`, manter polling local e adicionar link para `/account/orders/${order.id}` quando o pedido existir.

- [ ] **Step 2: Separar estados financeiros e operacionais**

Selecionar `paymentStatus` nas consultas de pedidos e exibir rótulos `Pagamento: Pendente/Pago/Falhou/Cancelado/Reembolsado` separados do status operacional, tanto na lista quanto no detalhe.

- [ ] **Step 3: Validar páginas afetadas**

Run: `npm run lint -- app/checkout/success/page.tsx app/account/orders && npx tsc --noEmit --pretty false`

Expected: PASS.

### Task 3: Verificação de regressão

**Files:**
- Test: `tests/checkout-pro-navigation.test.ts`

- [ ] **Step 1: Executar suíte e build**

Run: `npm test && npm run lint -- . && npm run build`

Expected: testes aprovados, lint sem erros e build aprovado.

- [ ] **Step 2: Validar manualmente sandbox**

Criar um novo pedido, confirmar que Checkout Pro abre em nova aba, que a aba Brabus mostra o pedido pendente, e que o webhook muda a confirmação para aprovada.
