# Operação exclusiva por PDV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desativar com segurança as vendas online e o Mercado Pago, mantendo catálogo e atendimento por WhatsApp e preservando todas as vendas pelo PDV.

**Architecture:** Um módulo server-only decide se vendas online estão habilitadas a partir de `ONLINE_SALES_ENABLED`, com padrão fechado. As rotas de checkout e Mercado Pago usam esse módulo antes de autenticação, acesso a banco ou chamada externa. Páginas servidoras passam o estado ao front, que substitui carrinho e checkout por uma chamada reutilizável de WhatsApp baseada em `StoreSettings.whatsapp`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, Node test runner com `tsx`, Docker Swarm.

## Global Constraints

- Executar inline em `codex/brabus-store-homelab-migration`; não criar worktree.
- Não apagar código, histórico, pedidos, estoque ou segredos do Mercado Pago.
- `ONLINE_SALES_ENABLED` tem padrão `false`; somente a string normalizada `true` o habilita.
- A mensagem pública exata é: `Vendas online indisponíveis no momento; compre pelo atendimento/PDV.`
- Usar `StoreSettings.whatsapp`; nunca introduzir outro número fixo.
- Não publicar, fazer push ou alterar DNS sem autorização explícita do usuário.
- Validar cada mudança com TDD, `npm test`, `npm run lint -- .` e `npm run build` antes do deploy.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `lib/online-sales.ts` | Controle server-only e resposta HTTP padronizada para vendas online bloqueadas. |
| `lib/whatsapp.ts` | Normalização do número e criação de URL `wa.me` com mensagem contextual. |
| `components/OnlineSalesUnavailable.tsx` | Aviso e botão de WhatsApp reutilizáveis para páginas públicas. |
| `components/AddToCartButton.tsx` | CTA por produto: carrinho quando habilitado, WhatsApp quando desligado. |
| `components/Navbar.tsx`, `components/NavbarWithSalesMode.tsx` | Ocultam o carrinho quando as vendas online estão desligadas sem ler ambiente no cliente. |
| `app/cart/page.tsx`, `app/checkout/**/*.tsx` | Mostram o aviso, sem ler ou alterar o carrinho. |
| `app/page.tsx`, `app/products/**/*.tsx` | Passam estado e WhatsApp aos CTAs de produto. |
| `app/api/checkout/**`, `app/api/mercadopago/**` | Bloqueio precoce das operações online. |
| `deploy/swarm/brabustore.yml`, `deploy/swarm/brabustore.env.example` | Propagação explícita da variável ao web e ao migrate. |

### Task 1: Criar o controle operacional server-only

**Files:**
- Create: `lib/online-sales.ts`
- Test: `tests/online-sales.test.ts`

**Interfaces:**
- Produces `isOnlineSalesEnabled(): boolean`.
- Produces `onlineSalesUnavailableResponse(): NextResponse<{ error: string; code: "ONLINE_SALES_UNAVAILABLE" }>`.
- Consumes somente `process.env.ONLINE_SALES_ENABLED` no servidor.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { isOnlineSalesEnabled, onlineSalesUnavailableResponse } from "../lib/online-sales"

test("keeps online sales disabled unless the flag is true", () => {
  const previous = process.env.ONLINE_SALES_ENABLED
  try {
    delete process.env.ONLINE_SALES_ENABLED
    assert.equal(isOnlineSalesEnabled(), false)
    process.env.ONLINE_SALES_ENABLED = " TRUE "
    assert.equal(isOnlineSalesEnabled(), true)
    process.env.ONLINE_SALES_ENABLED = "yes"
    assert.equal(isOnlineSalesEnabled(), false)
  } finally {
    if (previous === undefined) delete process.env.ONLINE_SALES_ENABLED
    else process.env.ONLINE_SALES_ENABLED = previous
  }
})

test("returns a stable unavailable response", async () => {
  const response = onlineSalesUnavailableResponse()
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    error: "Vendas online indisponíveis no momento; compre pelo atendimento/PDV.",
    code: "ONLINE_SALES_UNAVAILABLE",
  })
})
```

- [ ] **Step 2: Confirmar o ciclo RED**

Run: `npm test -- tests/online-sales.test.ts`

Expected: FAIL because `../lib/online-sales` does not exist.

- [ ] **Step 3: Implementar o módulo mínimo**

```ts
import { NextResponse } from "next/server"

export const ONLINE_SALES_UNAVAILABLE_MESSAGE =
  "Vendas online indisponíveis no momento; compre pelo atendimento/PDV."

export function isOnlineSalesEnabled() {
  return process.env.ONLINE_SALES_ENABLED?.trim().toLowerCase() === "true"
}

export function onlineSalesUnavailableResponse() {
  return NextResponse.json(
    { error: ONLINE_SALES_UNAVAILABLE_MESSAGE, code: "ONLINE_SALES_UNAVAILABLE" },
    { status: 503 },
  )
}
```

- [ ] **Step 4: Confirmar o ciclo GREEN**

Run: `npm test -- tests/online-sales.test.ts`

Expected: 2 passing tests.

- [ ] **Step 5: Commitar a unidade testada**

```bash
git add lib/online-sales.ts tests/online-sales.test.ts
git commit -m "feat: add online sales operational guard"
```

### Task 2: Bloquear APIs de venda antes de qualquer efeito

**Files:**
- Modify: `app/api/checkout/route.ts`
- Modify: `app/api/checkout/order/[id]/route.ts`
- Modify: `app/api/mercadopago/payment/[id]/route.ts`
- Modify: `app/api/mercadopago/webhook/route.ts`
- Create: `tests/online-sales-api.test.ts`

**Interfaces:**
- Consumes `isOnlineSalesEnabled` e `onlineSalesUnavailableResponse` de `lib/online-sales.ts`.
- Produces HTTP `503` com `code: "ONLINE_SALES_UNAVAILABLE"` antes de `auth`, Prisma, Mercado Pago ou leitura do corpo.
- Does not change PDV routes.

- [ ] **Step 1: Escrever testes de bloqueio com a flag desligada**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { POST as checkoutPost } from "../app/api/checkout/route"
import { POST as webhookPost } from "../app/api/mercadopago/webhook/route"

test("blocks checkout before parsing or persisting a request", async () => {
  process.env.ONLINE_SALES_ENABLED = "false"
  const response = await checkoutPost(new Request("http://localhost/api/checkout", { method: "POST" }))
  assert.equal(response.status, 503)
  assert.equal((await response.json()).code, "ONLINE_SALES_UNAVAILABLE")
})

test("blocks Mercado Pago webhook before processing payment data", async () => {
  process.env.ONLINE_SALES_ENABLED = "false"
  const response = await webhookPost(new Request("http://localhost/api/mercadopago/webhook", { method: "POST" }))
  assert.equal(response.status, 503)
  assert.equal((await response.json()).code, "ONLINE_SALES_UNAVAILABLE")
})
```

Add equivalent direct-handler tests for `GET /api/checkout/order/:id` and `GET /api/mercadopago/payment/:id`, supplying only their required route params and asserting `503`.

- [ ] **Step 2: Confirmar RED**

Run: `npm test -- tests/online-sales-api.test.ts`

Expected: FAIL because requests reach authentication/body parsing or return another status.

- [ ] **Step 3: Inserir o guard como primeira instrução de cada handler**

```ts
import { isOnlineSalesEnabled, onlineSalesUnavailableResponse } from "@/lib/online-sales"

export async function POST(req: Request) {
  if (!isOnlineSalesEnabled()) {
    return onlineSalesUnavailableResponse()
  }
  // código existente, sem outras mudanças
}
```

Use a mesma guarda no início de todos os `GET` citados e no `POST` do webhook. No webhook, a guarda vem antes de `await req.json()`; nos demais, antes de `auth()`.

- [ ] **Step 4: Confirmar GREEN e regressão do PDV**

Run: `npm test -- tests/online-sales-api.test.ts tests/pdv-fiado.test.ts tests/pdv-quick-customer.test.ts`

Expected: todos passam; nenhum teste de PDV é alterado.

- [ ] **Step 5: Commitar a unidade testada**

```bash
git add app/api/checkout app/api/mercadopago tests/online-sales-api.test.ts
git commit -m "feat: block online checkout APIs"
```

### Task 3: Centralizar WhatsApp e substituir CTAs públicos

**Files:**
- Create: `lib/whatsapp.ts`
- Create: `components/OnlineSalesUnavailable.tsx`
- Modify: `components/AddToCartButton.tsx`
- Modify: `app/page.tsx`
- Modify: `app/products/[slug]/page.tsx`
- Modify: `app/products/[slug]/ProductDetailClient.tsx`
- Modify: `components/WhatsAppButton.tsx`
- Test: `tests/whatsapp.test.ts`
- Test: `tests/add-to-cart-navigation.test.ts`

**Interfaces:**
- Produces `buildWhatsAppUrl(whatsapp: string, message: string): string`.
- `OnlineSalesUnavailable` receives `{ whatsapp: string; productName?: string }`.
- `AddToCartButton` receives `{ onlineSalesEnabled: boolean; whatsapp: string }` in addition to its current product props.
- Produces `getProductPurchaseAction({ onlineSalesEnabled, whatsapp, productName }): { kind: "cart" } | { kind: "whatsapp"; href: string }`.

- [ ] **Step 1: Escrever testes RED para URL e CTA**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { buildWhatsAppUrl } from "../lib/whatsapp"

test("builds a WhatsApp URL from StoreSettings digits and contextual message", () => {
  assert.equal(
    buildWhatsAppUrl("(85) 99783-9040", "Olá! Tenho interesse em Whey Pro."),
    "https://wa.me/5585997839040?text=Ol%C3%A1!%20Tenho%20interesse%20em%20Whey%20Pro.",
  )
})
```

Extend `tests/add-to-cart-navigation.test.ts` with:

```ts
test("uses WhatsApp rather than cart when online sales are disabled", () => {
  assert.deepEqual(
    getProductPurchaseAction({
      onlineSalesEnabled: false,
      whatsapp: "5585997839040",
      productName: "Whey Pro",
    }),
    {
      kind: "whatsapp",
      href: "https://wa.me/5585997839040?text=Ol%C3%A1%21%20Tenho%20interesse%20em%20Whey%20Pro.",
    },
  )
})
```

- [ ] **Step 2: Confirmar RED**

Run: `npm test -- tests/whatsapp.test.ts tests/add-to-cart-navigation.test.ts`

Expected: FAIL because the URL helper and disabled-action decision do not exist.

- [ ] **Step 3: Implementar a apresentação mínima**

Create `lib/whatsapp.ts` with `buildWhatsAppUrl`, stripping all non-digits and using `URLSearchParams` for `text`. Create `OnlineSalesUnavailable` as a server component with the exact approved message and an anchor with `target="_blank"` and `rel="noopener noreferrer"`.

In server pages, call `getPublicStoreSettings()` and `isOnlineSalesEnabled()` together, then pass `onlineSalesEnabled` and `whatsapp` to product CTAs. In `AddToCartButton`, use `getProductPurchaseAction` to render the WhatsApp anchor before any cart action whenever sales are disabled. Preserve stock/variant selection display, but do not require a selection to contact the store.

Replace the hard-coded number in `components/WhatsAppButton.tsx` by a server wrapper or prop supplied from `getPublicStoreSettings`; do not expose a second fallback number in that component.

- [ ] **Step 4: Confirmar GREEN**

Run: `npm test -- tests/whatsapp.test.ts tests/add-to-cart-navigation.test.ts`

Expected: todos passam; a ação desligada não contém rota `/cart`.

- [ ] **Step 5: Commitar a unidade testada**

```bash
git add lib/whatsapp.ts components/OnlineSalesUnavailable.tsx components/AddToCartButton.tsx components/WhatsAppButton.tsx app/page.tsx app/products tests/whatsapp.test.ts tests/add-to-cart-navigation.test.ts
git commit -m "feat: direct catalog shoppers to WhatsApp"
```

### Task 4: Tornar rotas históricas de compra seguras e amigáveis

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/Navbar.tsx`
- Create: `components/NavbarWithSalesMode.tsx`
- Modify: `app/cart/page.tsx`
- Create: `app/cart/CartPageClient.tsx`
- Modify: `app/checkout/page.tsx`
- Modify: `app/checkout/success/page.tsx`
- Create: `app/checkout/CheckoutSuccessPageClient.tsx`
- Modify: `app/checkout/cancel/page.tsx`
- Create: `tests/online-sales-pages.test.ts`

**Interfaces:**
- Consumes `OnlineSalesUnavailable`, `getPublicStoreSettings` e `isOnlineSalesEnabled`.
- No modo desligado, nenhuma dessas rotas renderiza, lê, grava ou limpa `useCartStore`.

- [ ] **Step 1: Escrever testes RED de estrutura**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("legacy purchase pages render the unavailable component", async () => {
  for (const path of ["app/cart/page.tsx", "app/checkout/page.tsx", "app/checkout/success/page.tsx", "app/checkout/cancel/page.tsx"]) {
    const source = await readFile(path, "utf8")
    assert.match(source, /OnlineSalesUnavailable/)
  }
})

test("navbar does not render the cart when online sales are disabled", async () => {
  const source = await readFile("components/Navbar.tsx", "utf8")
  assert.match(source, /onlineSalesEnabled/)
})
```

- [ ] **Step 2: Confirmar RED**

Run: `npm test -- tests/online-sales-pages.test.ts`

Expected: FAIL because the historical pages still implement checkout/cart logic.

- [ ] **Step 3: Substituir somente o ramo desligado**

Move the current client body of `app/cart/page.tsx` unchanged to `app/cart/CartPageClient.tsx`. Make `app/cart/page.tsx` a server component that loads the store settings and returns `OnlineSalesUnavailable` when disabled, otherwise `CartPageClient`. Apply the same split to the current client success component: move it to `app/checkout/CheckoutSuccessPageClient.tsx`; keep its `Suspense` wrapper in `app/checkout/success/page.tsx`, but render it only when sales are enabled. The checkout and cancel pages are already server components and branch directly.

Create `NavbarWithSalesMode` as a server component which passes `onlineSalesEnabled={isOnlineSalesEnabled()}` to the existing client `Navbar`. Replace the direct `Navbar` import in `app/layout.tsx` with the wrapper. `Navbar` conditionally renders the existing cart block only when enabled. Do not read `process.env` inside a client component.

- [ ] **Step 4: Confirmar GREEN**

Run: `npm test -- tests/online-sales-pages.test.ts`

Expected: 2 passing tests and no client-side cart operation in the disabled branches.

- [ ] **Step 5: Commitar a unidade testada**

```bash
git add app/layout.tsx components/Navbar.tsx components/NavbarWithSalesMode.tsx app/cart app/checkout tests/online-sales-pages.test.ts
git commit -m "feat: show PDV-only purchase notice"
```

### Task 5: Propagar o modo no Swarm, verificar e publicar sob gate

**Files:**
- Modify: `deploy/swarm/brabustore.yml`
- Modify: `deploy/swarm/brabustore.env.example`
- Modify: `tests/scripts/test-brabustore-swarm-manifest.sh`
- Modify: `docs/DEPLOY.md`

**Interfaces:**
- `ONLINE_SALES_ENABLED` entra em `x-web-environment`, portanto web e migrate recebem o mesmo estado.
- `/srv/brabustore/brabustore.env` do homelab recebe `ONLINE_SALES_ENABLED=false` como configuração não secreta.

- [ ] **Step 1: Escrever teste RED de manifesto**

Append to `tests/scripts/test-brabustore-swarm-manifest.sh` assertions equivalentes a:

```sh
grep -F 'ONLINE_SALES_ENABLED: ${ONLINE_SALES_ENABLED}' deploy/swarm/brabustore.yml
grep -F 'ONLINE_SALES_ENABLED=false' deploy/swarm/brabustore.env.example
```

- [ ] **Step 2: Confirmar RED**

Run: `sh tests/scripts/test-brabustore-swarm-manifest.sh`

Expected: FAIL because the variable is absent.

- [ ] **Step 3: Configurar e documentar**

Add `ONLINE_SALES_ENABLED: ${ONLINE_SALES_ENABLED}` to `x-web-environment`, then add `ONLINE_SALES_ENABLED=false` to the example. In `docs/DEPLOY.md`, document it as a non-secret release gate, its default-safe behavior, and the full reactivation requirements from the specification.

- [ ] **Step 4: Executar verificação local completa**

Run:

```bash
npm test
npm run lint -- .
npm run build
sh tests/scripts/test-brabustore-swarm-manifest.sh
```

Expected: cada comando termina com código 0.

- [ ] **Step 5: Commitar a unidade testada**

```bash
git add deploy/swarm/brabustore.yml deploy/swarm/brabustore.env.example tests/scripts/test-brabustore-swarm-manifest.sh docs/DEPLOY.md
git commit -m "chore: disable online sales in homelab"
```

- [ ] **Step 6: Gate de deploy autorizado**

Only after the user explicitly authorizes deploy, verify the working tree and the immutable digest produced by the CI run. Set `APPROVED_IMAGE_DIGEST` to that exact CI-recorded image reference, update `/srv/brabustore/brabustore.env` with `ONLINE_SALES_ENABLED=false`, then run:

```bash
sh scripts/deploy-homelab.sh "$APPROVED_IMAGE_DIGEST"
```

Post-deploy evidence must include: public `/api/health` `200`; `/products` `200`; product CTA contains `wa.me`; `/cart` and `/checkout` contain the approved message; `POST /api/checkout` and `POST /api/mercadopago/webhook` both return `503` plus `ONLINE_SALES_UNAVAILABLE`; and an authenticated SELLER completes a non-financial PDV navigation check. Compare order count immediately before and after blocked API probes to prove no online order was created.

## Final verification checklist

- [ ] Working tree contains only intended changes and every commit is on `codex/brabus-store-homelab-migration`.
- [ ] All Task 1–5 commands pass with fresh output.
- [ ] No secret value appears in command output, documentation, commit, or environment example.
- [ ] Homelab receives `ONLINE_SALES_ENABLED=false` only after explicit deploy authorization.
- [ ] Public behavior and authenticated PDV evidence are recorded before declaring the migration fully validated.
