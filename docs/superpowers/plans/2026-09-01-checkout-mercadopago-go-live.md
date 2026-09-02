# Checkout Mercado Pago Go-Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar vendas on-line com retirada gratuita ou Entrega Braba gratuita, e Pix e cartão no Mercado Pago Checkout Pro com confirmação segura e automática.

**Architecture:** A política de entrega será uma função pura compartilhada pelos fluxos público e PDV, usando a cidade e UF de `StoreSettings` como cobertura temporária. O checkout criará uma preferência Checkout Pro por pedido e o webhook autenticado aplicará a transição de pagamento de forma transacional e idempotente, reutilizando os serviços de estoque e status operacional existentes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, Mercado Pago SDK 2, Zod, Node test runner com tsx.

---

## Regras de execução obrigatórias

- Trabalhar na branch `feat/checkout-mercadopago-go-live`, criada a partir de `main`.
- Não criar nem usar worktree separado.
- Antes de iniciar, executar `git status --short`, confirmar que as alterações esperadas de documentação estão presentes e criar a branch com `git switch -c feat/checkout-mercadopago-go-live main`.
- Executar os checks definidos em cada tarefa antes de começar a próxima.
- Não criar commit, não executar `git push` e não integrar em `main` sem autorização explícita do responsável após a validação local final.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `lib/delivery-policy.ts` | Regra pura de cobertura, gratuidade e textos para retirada e Entrega Braba. |
| `lib/public-checkout.ts` | Contrato Zod do checkout público, restrito às modalidades permitidas. |
| `lib/pdv.ts` | Contrato Zod do PDV, restrito às mesmas modalidades. |
| `lib/manual-orders.ts` | Persistência de pedidos manuais usando a política de entrega. |
| `app/api/checkout/route.ts` | Criação de pedido e preferência Checkout Pro sem cálculo de frete externo. |
| `lib/mercadopago/checkout-pro.ts` | Corpo de preferência, URLs canônicas de retorno/notificação e resumo sanitizado de pagamento. |
| `lib/mercadopago/webhook.ts` | Validação de assinatura, mapa de estados e processamento transacional idempotente. |
| `app/api/mercadopago/webhook/route.ts` | Recebimento, validação e resposta de notificações Mercado Pago. |
| `app/api/mercadopago/payment/[id]/route.ts` | Consulta autorizada e sanitizada do pagamento de um pedido. |
| `app/checkout/CheckoutPageClient.tsx` | Jornada pública com duas entregas gratuitas e redirecionamento Checkout Pro. |
| `app/checkout/success/page.tsx` | Estado aprovado/pendente do pedido com reconsulta, sem QR próprio. |
| `tests/*.test.ts` | Testes unitários das regras de entrega, preferência e transições de pagamento. |

### Task 1: Preparar a política de entrega gratuita

**Files:**
- Create: `tests/delivery-policy.test.ts`
- Create: `lib/delivery-policy.ts`
- Modify: `lib/public-checkout.ts:1-133`
- Modify: `lib/pdv.ts:1-186`

- [ ] **Step 1: Escrever os testes que definem as duas modalidades permitidas**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { DeliveryPolicyError, resolveDelivery } from "@/lib/delivery-policy"

test("resolves free pickup without an address", () => {
  assert.deepEqual(resolveDelivery({ shippingType: "PICKUP", address: {}, store: { city: "Aracoiaba", state: "CE" } }), {
    cost: 0,
    carrier: "Retirada na Loja",
    deadline: "Retirada imediata",
  })
})

test("accepts Entrega Braba for the configured city ignoring case and accents", () => {
  assert.deepEqual(resolveDelivery({
    shippingType: "LOCAL_DELIVERY",
    address: { addressCity: "araçoiaba", addressState: "ce" },
    store: { city: "Aracoiaba", state: "CE" },
  }), { cost: 0, carrier: "Entrega Braba", deadline: "A confirmar pela loja" })
})

test("rejects any delivery outside the configured city or state", () => {
  assert.throws(
    () => resolveDelivery({ shippingType: "LOCAL_DELIVERY", address: { addressCity: "Baturité", addressState: "CE" }, store: { city: "Aracoiaba", state: "CE" } }),
    DeliveryPolicyError,
  )
})

test("rejects the legacy NATIONAL value", () => {
  assert.throws(
    () => resolveDelivery({ shippingType: "NATIONAL", address: {}, store: { city: "Aracoiaba", state: "CE" } }),
    DeliveryPolicyError,
  )
})
```

- [ ] **Step 2: Executar o teste para confirmar a falha inicial**

Run: `node --import tsx --test tests/delivery-policy.test.ts`

Expected: FAIL com erro de módulo `@/lib/delivery-policy` inexistente.

- [ ] **Step 3: Implementar a política pura sem consultar banco ou API externa**

```ts
import { ShippingType } from "@prisma/client"

type DeliveryAddress = { addressCity?: string | null; addressState?: string | null }
type DeliveryStore = { city: string; state: string }

export class DeliveryPolicyError extends Error {}

export function normalizeLocation(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-BR")
}

export function resolveDelivery(input: {
  shippingType: "PICKUP" | "LOCAL_DELIVERY" | "NATIONAL"
  address: DeliveryAddress
  store: DeliveryStore
}) {
  if (input.shippingType === ShippingType.PICKUP) {
    return { cost: 0, carrier: "Retirada na Loja", deadline: "Retirada imediata" }
  }

  if (input.shippingType !== ShippingType.LOCAL_DELIVERY) {
    throw new DeliveryPolicyError("A modalidade de entrega selecionada não está disponível.")
  }

  if (
    normalizeLocation(input.address.addressCity) !== normalizeLocation(input.store.city) ||
    normalizeLocation(input.address.addressState) !== normalizeLocation(input.store.state)
  ) {
    throw new DeliveryPolicyError("A Entrega Braba está disponível somente para a cidade da loja.")
  }

  return { cost: 0, carrier: "Entrega Braba", deadline: "A confirmar pela loja" }
}
```

Remove `ShippingType.NATIONAL` from `PDV_SHIPPING_TYPE_VALUES`, remove `shippingServiceId` and its refinement from both schemas, and replace `z.nativeEnum(ShippingType)` with `z.enum(["PICKUP", "LOCAL_DELIVERY"])` in `createPublicCheckoutSchema`. Keep the Prisma enum unchanged because existing orders may contain `NATIONAL`; it is a historical read-only value.

- [ ] **Step 4: Executar os testes da política e dos contratos**

Run: `node --import tsx --test tests/delivery-policy.test.ts tests/order-discount.test.ts`

Expected: PASS, incluindo a rejeição de `NATIONAL` e a comparação normalizada de cidade/UF.

### Task 2: Aplicar a política à criação de pedidos manuais e ao PDV

**Files:**
- Modify: `lib/manual-orders.ts:1-417`
- Modify: `app/api/admin/pdv/orders/route.ts`
- Modify: `app/admin/pdv/page.tsx`
- Modify: `app/admin/pdv/PdvManager.tsx`

- [ ] **Step 1: Acrescentar cenários de pedido manual ao teste de entrega**

```ts
test("stores the approved carrier, deadline and zero cost for Entrega Braba", () => {
  const delivery = resolveDelivery({
    shippingType: "LOCAL_DELIVERY",
    address: { addressCity: "Aracoiaba", addressState: "CE" },
    store: { city: "Aracoiaba", state: "CE" },
  })
  assert.equal(delivery.cost, 0)
  assert.equal(delivery.carrier, "Entrega Braba")
  assert.equal(delivery.deadline, "A confirmar pela loja")
})
```

- [ ] **Step 2: Reutilizar `resolveDelivery` em `createManualOrder`**

Remove `shippingServiceId`, `calculateOrderWeight`, `fetchMelhorEnvioServices`, `findLocalDeliveryZone` and `normalizePostalCode` from `lib/manual-orders.ts`. Read `StoreSettings.addressCity` and `StoreSettings.addressState` before persisting, then assign the resolved result exactly once:

```ts
const delivery = resolveDelivery({
  shippingType: input.shippingType,
  address: normalizedAddress,
  store: { city: storeSettings.addressCity, state: storeSettings.addressState },
})

const shippingCost = delivery.cost
const shippingCarrier = delivery.carrier
const shippingDeadline = delivery.deadline
```

Retain the existing `validateAddressForShipping` rule so only `LOCAL_DELIVERY` requires a complete address. Pass `addressCity` and `addressState` from `app/admin/pdv/page.tsx` into `PdvManager`, replace zone lookup/selection with `resolveDelivery`, remove the national option and do not send `shippingServiceId` from the manager or its API route.

- [ ] **Step 3: Verificar que não há fluxo nacional no PDV**

Run: `npm test && npm run lint -- lib/manual-orders.ts lib/pdv.ts app/admin/pdv`

Expected: PASS e nenhuma opção de entrega nacional no gerenciador PDV.

### Task 3: Simplificar o checkout público para retirada e Entrega Braba

**Files:**
- Modify: `app/checkout/page.tsx:1-12`
- Modify: `app/checkout/CheckoutPageClient.tsx:1-933`
- Modify: `app/api/checkout/route.ts:1-637`

- [ ] **Step 1: Escrever o teste de contrato do payload público**

```ts
import { createPublicCheckoutSchema } from "@/lib/public-checkout"

test("does not accept NATIONAL or shippingServiceId in the public checkout", () => {
  const result = createPublicCheckoutSchema.safeParse({
    items: [{ productId: "product", quantity: 1 }],
    shippingType: "NATIONAL",
    shippingServiceId: "sedex",
    paymentMethod: "MERCADO_PAGO_CARD",
    address: {},
  })
  assert.equal(result.success, false)
})
```

- [ ] **Step 2: Remover estado, requests e interface de cálculo externo**

Pass `storeSettings.addressCity` and `storeSettings.addressState` from `app/checkout/page.tsx`. In `CheckoutPageClient`, remove `LocalZone`, `NationalService`, `localZones`, `nationalServices`, `selectedNationalServiceId`, `shippingLookupError`, `shippingLookupLoading`, `fetch("/api/shipping/local-zones")` and `fetch("/api/shipping/calculate")`. Keep the existing CEP lookup only to prefill the address.

Use the same normalization as `resolveDelivery` to derive a local UI boolean. Render exactly these cards:

```tsx
<span className="font-bold uppercase tracking-widest text-sm">Retirar na Loja</span>
<span className="text-[var(--color-primary)] font-bold">Grátis</span>

<span className="font-bold uppercase tracking-widest text-sm">Entrega Braba</span>
<span className="text-[var(--color-primary)] font-bold">Grátis</span>
<p className="text-xs text-gray-400">Disponível para {storeAddressCity} - {storeAddressState}. Prazo a confirmar pela loja.</p>
```

When address city/UF does not match, keep the card disabled and display `A Entrega Braba está disponível somente para {storeAddressCity} - {storeAddressState}.` Remove `NATIONAL` from `ShippingTypeValue`, all related payment exceptions, the carrier section, `shippingServiceId` from the POST body and any reference to Melhor Envio.

- [ ] **Step 3: Reusar a política no endpoint de checkout**

In `app/api/checkout/route.ts`, remove the `lib/shipping` and QR imports, all weight accumulation and both blocks for `ShippingType.NATIONAL`. Read `StoreSettings` once, call `resolveDelivery` after normalizing the payload address, and use the result for both online payment branches. The persisted values must be:

```ts
shippingCost: delivery.cost,
shippingCarrier: delivery.carrier,
shippingDeadline: delivery.deadline,
total: itemsTotal + delivery.cost,
```

Because delivery cost is always zero, do not create a shipping item in Mercado Pago. The sum of preference items must equal `Order.total`.

- [ ] **Step 4: Executar testes e inspeção manual do checkout**

Run: `node --import tsx --test tests/delivery-policy.test.ts && npm run lint -- app/checkout app/api/checkout lib/public-checkout.ts`

Expected: PASS. Manually verify that the public checkout only exposes the two approved delivery methods and a direct payload with `NATIONAL` returns HTTP 400.

### Task 4: Remover Melhor Envio e rotas obsoletas

**Files:**
- Delete: `lib/shipping.ts`
- Delete: `app/api/shipping/calculate/route.ts`
- Delete: `app/api/shipping/local-zones/route.ts`
- Modify: `lib/integration-status.ts`
- Modify: `scripts/check-integrations.ts`
- Modify: `.env.example`
- Modify: `package.json`
- Delete: `scripts/stripe-listen.sh`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Confirmar referências antes de remover módulos**

Run: `rg -n "Melhor Envio|MELHOR_ENVIO|fetchMelhorEnvioServices|findLocalDeliveryZone|calculateOrderWeight|NATIONAL|stripe:listen" app lib scripts prisma package.json .env.example`

Expected: all active callers are covered by Tasks 1-3; do not delete historical documents or persisted enum values in this step.

- [ ] **Step 2: Remover código, configuração e checks externos**

Delete the two shipping routes and `lib/shipping.ts`. Remove Melhor Envio from the integration summary and `validateMelhorEnvio`; `integrations:check` must validate only Mercado Pago and Instagram. Remove `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_BASE_URL`, all Stripe keys and `stripe:listen`; add the Mercado Pago variables below:

```env
MERCADO_PAGO_ACCESS_TOKEN="TEST-..."
MERCADO_PAGO_ENVIRONMENT="sandbox"
MERCADO_PAGO_WEBHOOK_SECRET="secret-signature-do-painel-mercado-pago"
```

Remove `LocalDeliveryZone` seed records but retain the model/table for the future neighborhood module. Do not remove `stripeSessionId` or `stripePaymentId` columns because they can belong to historical orders.

- [ ] **Step 3: Verificar remoção**

Run: `rg -n "MELHOR_ENVIO|fetchMelhorEnvioServices|findLocalDeliveryZone|calculateOrderWeight|stripe:listen" app lib scripts prisma package.json .env.example`

Expected: no matches. Then run `npm run prisma:generate`.

### Task 5: Construir preferências Checkout Pro consistentes

**Files:**
- Create: `tests/mercadopago-checkout-pro.test.ts`
- Create: `lib/mercadopago/checkout-pro.ts`
- Modify: `app/api/checkout/route.ts:50-91,225-593`
- Modify: `lib/mercadopago/types.ts:66-90`

- [ ] **Step 1: Escrever testes para a preferência e URLs canônicas**

```ts
import { buildCheckoutProPreference, buildCheckoutUrls } from "@/lib/mercadopago/checkout-pro"

test("uses canonical return and notification URLs with order_id", () => {
  assert.deepEqual(buildCheckoutUrls("https://loja.example.com", "order_123"), {
    back_urls: {
      success: "https://loja.example.com/checkout/success?order_id=order_123",
      pending: "https://loja.example.com/checkout/success?order_id=order_123",
      failure: "https://loja.example.com/checkout/cancel?order_id=order_123",
    },
    notification_url: "https://loja.example.com/api/mercadopago/webhook",
  })
})

test("builds a Pix preference whose items total equals the order total", () => {
  const preference = buildCheckoutProPreference({
    orderId: "order_123", orderNumber: "BRAB-260901-0001", userId: "user_123", email: "buyer@example.com",
    paymentMethod: "MERCADO_PAGO_PIX", origin: "https://loja.example.com",
    items: [{ id: "variant_1", title: "Produto", quantity: 2, unit_price: 25 }],
  })
  assert.equal(preference.items[0].unit_price * preference.items[0].quantity, 50)
  assert.equal(preference.notification_url, "https://loja.example.com/api/mercadopago/webhook")
  assert.deepEqual(preference.payment_methods.excluded_payment_types, [{ id: "credit_card" }, { id: "debit_card" }])
})
```

- [ ] **Step 2: Implementar o construtor da preferência**

```ts
export function buildCheckoutUrls(origin: string, orderId: string) {
  const baseUrl = origin.replace(/\/$/, "")
  return {
    back_urls: {
      success: `${baseUrl}/checkout/success?order_id=${orderId}`,
      pending: `${baseUrl}/checkout/success?order_id=${orderId}`,
      failure: `${baseUrl}/checkout/cancel?order_id=${orderId}`,
    },
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
  }
}
```

`buildCheckoutProPreference` must add `external_reference`, `metadata.orderId`, `metadata.orderNumber`, payer email and the existing maximum of 12 installments. Exclude Pix for card and card/debit for Pix. Use `NEXTAUTH_URL` as origin and reject checkout with HTTP 503 when it is absent or not HTTPS outside development; do not use the request `Origin` header.

- [ ] **Step 3: Unificar cartão e Pix no endpoint**

Create one pending order per request, create one Checkout Pro preference and return only:

```ts
return NextResponse.json({
  orderId: order.id,
  orderNumber: order.orderNumber,
  initPoint: getMercadoPagoInitPoint(preferenceResponse),
})
```

Remove `mpPayment.create`, `generateQrCodeBase64`, QR response fields and the unused Pix preference. Update the client CTA to `Continuar para pagamento seguro` for both Mercado Pago methods and always redirect to `initPoint`.

- [ ] **Step 4: Executar os testes de preferência**

Run: `node --import tsx --test tests/mercadopago-checkout-pro.test.ts && npm run lint -- lib/mercadopago app/api/checkout app/checkout/CheckoutPageClient.tsx`

Expected: PASS, com URLs canônicas e total idêntico entre itens Mercado Pago e pedido.

### Task 6: Validar assinatura e transições idempotentes de pagamento

**Files:**
- Create: `tests/mercadopago-webhook.test.ts`
- Modify: `lib/mercadopago/env.ts`
- Modify: `lib/mercadopago/settings.ts`
- Modify: `lib/mercadopago/webhook.ts`
- Modify: `app/api/mercadopago/webhook/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Escrever os testes de assinatura e transição pura**

```ts
import { createHmac } from "node:crypto"
import { getPaymentTransition, validateWebhookSignature } from "@/lib/mercadopago/webhook"

test("accepts the Mercado Pago v1 signature for a payment notification", () => {
  const manifest = "id:123;request-id:req_1;ts:1700000000;"
  const signature = createHmac("sha256", "secret").update(manifest).digest("hex")
  assert.equal(validateWebhookSignature({ signature: `ts=1700000000,v1=${signature}`, requestId: "req_1", dataId: "123", secret: "secret" }), true)
})

test("marks only the first pending approval as stock-decrementing", () => {
  assert.equal(getPaymentTransition("PENDING", "approved").stockAction, "decrement")
  assert.equal(getPaymentTransition("PAID", "approved").stockAction, "none")
})

test("restocks only a paid order fully refunded once", () => {
  assert.equal(getPaymentTransition("PAID", "refunded").stockAction, "increment")
  assert.equal(getPaymentTransition("REFUNDED", "refunded").stockAction, "none")
})
```

- [ ] **Step 2: Implementar configuração e validação de assinatura**

Expose `getMercadoPagoWebhookSecret()` from `lib/mercadopago/env.ts`; it reads only `MERCADO_PAGO_WEBHOOK_SECRET` and returns `null` when blank. Parse `x-signature` as comma-separated `ts` and `v1`, use `x-request-id` and the payload `data.id`, build the manifest exactly as `id:${dataId};request-id:${requestId};ts:${timestamp};`, then compare HMAC SHA-256 values with `crypto.timingSafeEqual`. Reject missing or invalid signature data before calling the Mercado Pago API.

- [ ] **Step 3: Implementar a transição e a persistência transacional**

Implement `getPaymentTransition(currentStatus, mercadoPagoStatus)` with these rules:

| Estado atual | Evento Mercado Pago | Novo pagamento | Ação de estoque |
| --- | --- | --- | --- |
| `PENDING` | `approved` | `PAID` | decrementar |
| `PENDING` | `rejected` | `FAILED` | nenhuma |
| `PENDING` | `cancelled` | `CANCELLED` | nenhuma |
| `PAID` | `refunded` ou `charged_back` | `REFUNDED` | incrementar |
| qualquer outro | repetido ou regressivo | manter atual | nenhuma |

Within `prisma.$transaction`, atomically claim approval with `tx.order.updateMany({ where: { id: orderId, paymentStatus: PaymentStatus.PENDING }, data: { paymentStatus: PaymentStatus.PAID, status: OrderStatus.PAID, paidAt: new Date(), mercadoPagoPaymentId: paymentId } })`. Only when `count === 1`, load order items and call `decrementOrderItemStock`. Apply the symmetric `paymentStatus: PaymentStatus.PAID` guard before a full refund and call `incrementOrderItemStock` only when that update count is one. Call `dispatchOrderPaid(orderId)` after the approval transaction commits and only for the transaction that claimed the state.

Before transition, verify `payment.external_reference`, `payment.transaction_amount`, currency `BRL` and payment method match the local order. Return a non-2xx response for invalid data so Mercado Pago retries only genuine processing failures; return 200 for valid repeated events.

- [ ] **Step 4: Executar testes do webhook**

Run: `node --import tsx --test tests/mercadopago-webhook.test.ts && npm run lint -- lib/mercadopago app/api/mercadopago/webhook`

Expected: PASS para assinatura válida, assinatura inválida, aprovação repetida e reembolso repetido.

### Task 7: Restringir consulta de pagamento e corrigir retorno do cliente

**Files:**
- Create: `tests/mercadopago-payment-summary.test.ts`
- Modify: `lib/mercadopago/checkout-pro.ts`
- Modify: `app/api/mercadopago/payment/[id]/route.ts`
- Modify: `app/checkout/success/page.tsx`
- Modify: `app/checkout/cancel/page.tsx`
- Delete: `app/checkout/pix/QrCodeDisplay.tsx`

- [ ] **Step 1: Escrever teste do resumo sanitizado**

```ts
import { serializeMercadoPagoPaymentSummary } from "@/lib/mercadopago/checkout-pro"

test("returns only the checkout payment fields safe for the order owner", () => {
  assert.deepEqual(serializeMercadoPagoPaymentSummary({
    id: 10, status: "approved", status_detail: "accredited", payment_type_id: "pix",
    transaction_amount: 50, external_reference: "order_123", payer: { email: "private@example.com" },
  }), {
    id: "10", status: "approved", statusDetail: "accredited", paymentType: "pix", amount: 50, orderId: "order_123",
  })
})
```

- [ ] **Step 2: Autorizar pelo pedido antes de consultar ou retornar pagamento**

Require session, locate an order where `userId` equals the session user and either `mercadoPagoPaymentId` equals route id or the request `order_id` equals the order id. Fetch the remote payment, require `external_reference === order.id`, then return `serializeMercadoPagoPaymentSummary(payment)`. Return 401 without session, 404 without an owned order and 409 for a remote reference mismatch; never return the SDK payload directly.

- [ ] **Step 3: Atualizar as telas de retorno Checkout Pro**

Remove Stripe types/copy, all manual Pix copy, `QrCodeDisplay`, `qr_code`, `qr_base64`, `showPix` and the unconditional `clearCart()` effect. In the success page, call `/api/checkout/order/${orderId}` immediately and every five seconds for at most two minutes while `paymentStatus === "PENDING"`; clear the cart once that first order summary is loaded successfully. Show `Pagamento aprovado`, `Pagamento em análise` or `Pagamento não aprovado` from the local order state. In cancel, read `order_id` and state that payment was not completed and the user can retry from checkout; do not mention boleto.

- [ ] **Step 4: Executar testes e validação manual das telas**

Run: `node --import tsx --test tests/mercadopago-payment-summary.test.ts && npm run lint -- app/api/mercadopago/payment app/checkout`

Expected: PASS. Manually validate an approved redirect, a pending redirect, a cancelled redirect and an authenticated user attempting to query another user's payment.

### Task 8: Atualizar documentação operacional e backlog

**Files:**
- Modify: `README.md`
- Modify: `docs/TASKS.md`
- Modify: `docs/MIGRATION.md`
- Modify: `docs/PLAN.md`
- Modify: `docs/PRD.md`
- Modify: `docs/ORDER_NUMBERING.md`
- Modify: `docs/prompt-ecommerce-v2.md`
- Modify: `docs/superpowers/specs/2026-09-01-checkout-mercadopago-go-live-design.md`

- [ ] **Step 1: Atualizar instruções de ambiente e operação**

Document Mercado Pago Checkout Pro, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_ENVIRONMENT`, `MERCADO_PAGO_WEBHOOK_SECRET`, the public HTTPS webhook URL and the two approved delivery methods. Remove operational instructions for Stripe, Melhor Envio, carrier selection and national delivery. Preserve historical references only where a document explicitly records a past migration decision.

- [ ] **Step 2: Atualizar o checklist de homologação**

Replace the old checklist with these mandatory scenarios: Pix/retirada, Pix/Entrega Braba, cartão/retirada, cartão/Entrega Braba, rejected payment, cancelled payment, full refund, duplicated approval webhook, invalid webhook signature and direct `NATIONAL` payload rejection. Mark no scenario as complete before actual sandbox evidence is captured.

- [ ] **Step 3: Revisar documentação removida**

Run: `rg -n "MELHOR_ENVIO|Melhor Envio|stripe:listen|Payment Brick|boleto|Envio Nacional" README.md docs .env.example package.json`

Expected: only explicitly historical documents may match; current README, task list and operational guides have no matches.

### Task 9: Validar localmente e executar a homologação sandbox

**Files:**
- Modify only if defects are found during validation; otherwise none.

- [ ] **Step 1: Executar a suíte e checks estáticos**

Run: `npm test && npm run lint -- . && npm run build`

Expected: all tests pass, ESLint exits 0 and build exits 0.

- [ ] **Step 2: Executar a homologação sandbox documentada**

With sandbox credentials and a public HTTPS URL configured, run `npm run integrations:check`. Execute the ten scenarios in Task 8 and record order number, expected payment status, final operational status, stock delta and webhook result for each. Verify that the Mercado Pago total equals the local order total in the four purchase scenarios.

- [ ] **Step 3: Fazer a revisão final antes de qualquer commit**

Run: `git status --short && git diff --check && git diff --stat`

Expected: no whitespace errors and only planned checkout, payment, delivery, test, configuration and documentation files changed.

- [ ] **Step 4: Aguardar autorização explícita**

Do not run `git add`, `git commit`, `git push`, merge or deploy. Present the validation evidence and wait for the responsible person to authorize a commit. After an authorized commit, wait again for explicit authorization before integrating into `main` (production).

## Plan self-review

- GL-DEL-01 to GL-DEL-04: Tasks 1-4 restrict creation paths, eliminate Better Envio runtime code and retain `NATIONAL` only for historical records.
- GL-MP-01 and GL-MP-02: Task 5 builds a single Checkout Pro preference from the persisted order and sends canonical notification URLs.
- GL-MP-03: Task 6 validates signatures and applies guarded transactional stock/status transitions.
- GL-MP-04: Task 7 returns an owned, sanitized payment summary only.
- GL-UX-01 and GL-UX-02: Tasks 3, 5 and 7 remove legacy copy, use Checkout Pro for Pix and retain a pending-payment reconsulta path.
- GL-OPS-01: Tasks 8 and 9 define and execute sandbox evidence before a controlled production order.
- The plan intentionally has no commit step; it follows the approved authorization gate.
