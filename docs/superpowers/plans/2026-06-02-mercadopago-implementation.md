# Mercado Pago Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir Stripe por Mercado Pago para pagamentos online (Pix instantâneo + cartão via Payment Brick) com webhook para confirmação automática.

**Architecture:** Integração via Mercado Pago Checkout API. Pix usa API pura com QR code customizado. Cartão usa Payment Brick (iframe MP). Webhook para atualização de status em tempo real.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma, Mercado Pago SDK, qrcode

---

## Dependências de Arquivos

```
Criações:
lib/mercadopago/types.ts          # Tipos compartilhados MP
lib/mercadopago/client.ts        # Cliente SDK MP
lib/mercadopago/pix.ts           # Geração QR code
lib/mercadopago/webhook.ts       # Validação webhook
app/api/mercadopago/webhook/route.ts     # Endpoint webhook
app/api/mercadopago/payment/[id]/route.ts # Consulta status
app/checkout/pix/QrCodeDisplay.tsx        # Componente QR

Modificações:
app/api/checkout/route.ts        # Substituir Stripe por MP
app/checkout/CheckoutPageClient.tsx      # UI Pix + Card
app/checkout/success/page.tsx    # Mostrar QR se Pix
package.json                     # Adicionar mercadopago, remover stripe
app/admin/settings/SettingsForm.tsx # Config MP no admin

Deleções:
lib/stripe.ts
lib/stripe-webhook.ts (se existir)
```

---

## Task 1: Configurar Dependências

**Files:**
- Modify: `package.json`
- Modify: `.env`

- [ ] **Step 1: Adicionar mercadopago SDK**

```json
// Adicionar em dependencies
"mercadopago": "^2.3.0",
"qrcode": "^1.5.3"
```

- [ ] **Step 2: Remover Stripe de dependencies**

```json
// Remover de dependencies
"@stripe/stripe-js": "^8.10.0",
"stripe": "^20.4.1"

// Remover de devDependencies (se existir)
```

- [ ] **Step 3: Corrigir .env**

Linha 21 do .env está quebrada (`AC` solto). Corrigir:
```env
#Mercado Pago
PUBLIC_KEY=TEST-8534934f-aa47-4e1e-958f-a3692a0f6dec
ACCESS_TOKEN=TEST-8723459540758265-092415-35e78724d3366e816c809205df5e2748-184299286
```

- [ ] **Step 4: Instalar dependências**

```bash
npm install
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env
git commit -m "deps: add mercadopago, remove stripe"
```

---

## Task 2: Criar Tipos Compartilhados

**Files:**
- Create: `lib/mercadopago/types.ts`

- [ ] **Step 1: Criar arquivo com tipos**

```typescript
export type MercadoPagoPaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "in_process"
  | "in_mediation"
  | "charged_back"
  | "partial_refunded"

export type MercadoPagoPaymentType =
  | "credit_card"
  | "debit_card"
  | "pix"
  | "ticket"
  | "account_money"

export interface MercadoPagoPayment {
  id: string
  status: MercadoPagoPaymentStatus
  status_detail: string
  payment_type_id: MercadoPagoPaymentType
  date_created: string
  date_approved: string | null
  date_last_updated: string
  external_reference: string | null
  transaction_amount: number
  transaction_amount_refunded: number
  description: string | null
  collector_id: number
  payer: {
    id: string
    email: string
    identification: {
      type: string
      number: string
    }
  }
  metadata: Record<string, unknown>
}

export interface MercadoPagoWebhookPayload {
  topic: string
  id: string
  action: string
  date_created: string
  api_version: string
  data: {
    id: string
  }
}

export interface MercadoPagoPixQrCode {
  qr_code: string
  qr_code_base64: string | null
  point_of_interface: string
}

export interface MercadoPagoPreference {
  id: string
  init_point: string
  sandbox_init_point: string
}

export interface MercadoPagoCreatePreferenceRequest {
  items: Array<{
    id: string
    title: string
    description?: string
    picture_url?: string
    category_id?: string
    quantity: number
    currency_id: string
    unit_price: number
  }>
  external_reference?: string
  metadata?: Record<string, unknown>
  payment_methods?: {
    excluded_payment_types?: Array<{ id: string }>
    installments?: number
  }
  back_urls?: {
    success: string
    failure: string
    pending: string
  }
  notification_url?: string
  auto_return?: "approved" | "pending"
}

export interface MercadoPagoCreatePreferenceResponse {
  id: string
  init_point: string
  sandbox_init_point: string
  date_created: string
  init_point_in_point_of_interface?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mercadopago/types.ts
git commit -m "feat: add Mercado Pago shared types"
```

---

## Task 3: Criar Cliente Mercado Pago

**Files:**
- Create: `lib/mercadopago/client.ts`

- [ ] **Step 1: Criar cliente SDK**

```typescript
import MercadoPago from "mercadopago"
import { getPublicStoreSettings } from "@/lib/store-settings"

let client: MercadoPago.SDK | null = null

export function getMercadoPagoClient(): MercadoPago.SDK {
  if (client) {
    return client
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado")
  }

  client = new MercadoPago.AccessTokenFixture(accessToken) as unknown as MercadoPago.SDK

  const isSandbox = process.env.MERCADO_PAGO_ENVIRONMENT !== "production"
  if (isSandbox) {
    client.set({ sandbox_mode: true })
  }

  return client
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
}

export function isMercadoPagoActive(): boolean {
  // TODO: implementar check no store settings
  return isMercadoPagoConfigured()
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mercadopago/client.ts
git commit -m "feat: add Mercado Pago client SDK wrapper"
```

---

## Task 4: Criar Utilitário Pix

**Files:**
- Create: `lib/mercadopago/pix.ts`

- [ ] **Step 1: Criar utilitário QR code**

```typescript
import QRCode from "qrcode"
import type { MercadoPagoPixQrCode } from "./types"

export async function generateQrCodeBase64(qrCodeText: string): Promise<string> {
  const base64 = await QRCode.toDataURL(qrCodeText, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  })
  return base64
}

export function formatPixCopyText(
  paymentId: string,
  amount: number,
  merchantName: string,
): string {
  // Formato EMV Pix (versão simplificada)
  const formattedAmount = amount.toFixed(2)
  return `${paymentId}|${formattedAmount}|${merchantName}`
}

export interface PixPaymentData {
  qrCode: string
  qrCodeBase64: string
  paymentId: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mercadopago/pix.ts
git commit -m "feat: add Pix QR code generation utilities"
```

---

## Task 5: Criar Handler Webhook

**Files:**
- Create: `lib/mercadopago/webhook.ts`

- [ ] **Step 1: Criar validação e processamento webhook**

```typescript
import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import type { MercadoPagoWebhookPayload, MercadoPagoPaymentStatus } from "./types"

const STATUS_MAP: Record<MercadoPagoPaymentStatus, Prisma.Enum$PaymentStatusFieldUpdateOperationsInput> = {
  pending: { set: "PENDING" },
  approved: { set: "PAID" },
  rejected: { set: "FAILED" },
  cancelled: { set: "CANCELLED" },
  refunded: { set: "REFUNDED" },
  in_process: { set: "PENDING" },
  in_mediation: { set: "PENDING" },
  charged_back: { set: "REFUNDED" },
  partial_refunded: { set: "PARTIAL_REFUNDED" },
}

export function validateWebhookSignature(
  topic: string,
  apiVersion: string,
  id: string,
  sentSignature: string,
  sentDate: string,
  accessToken: string,
): boolean {
  if (!sentSignature || !sentDate) {
    return false
  }

  const message = `${topic}|${apiVersion}|${id}|${sentDate}`
  const crypto = require("crypto")
  const expectedSignature = crypto
    .createHmac("sha256", accessToken)
    .update(message)
    .digest("hex")

  return crypto.timingSafeEqual(
    Buffer.from(sentSignature),
    Buffer.from(expectedSignature),
  )
}

export async function processWebhookPayment(
  paymentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getMercadoPagoClient } = await import("./client")
    const mp = getMercadoPagoClient()

    const payment = await mp.payment.get(paymentId)

    if (!payment || !payment.body) {
      return { success: false, error: "Payment not found" }
    }

    const paymentData = payment.body
    const externalReference = paymentData.external_reference

    if (!externalReference) {
      return { success: false, error: "No external reference" }
    }

    const orderId = externalReference
    const mpStatus = paymentData.status as MercadoPagoPaymentStatus
    const newPaymentStatus = STATUS_MAP[mpStatus]

    if (!newPaymentStatus) {
      return { success: false, error: `Unknown payment status: ${mpStatus}` }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: newPaymentStatus,
        mercadoPagoPaymentId: paymentId,
        paidAt: mpStatus === "approved" ? new Date() : undefined,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Erro processando webhook:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/mercadopago/webhook.ts
git commit -m "feat: add Mercado Pago webhook handler"
```

---

## Task 6: Criar Endpoint Webhook

**Files:**
- Create: `app/api/mercadopago/webhook/route.ts`

- [ ] **Step 1: Criar route webhook**

```typescript
import { NextResponse } from "next/server"
import { validateWebhookSignature, processWebhookPayment } from "@/lib/mercadopago/webhook"

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-signature")
    const signatureDate = req.headers.get("x-signature-date")
    const apiVersion = req.headers.get("x-api-version") ?? "v1"

    const body = await req.json()

    const { topic, id, action, data } = body

    if (!topic || !id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Validar assinatura para merchant_order
    if (topic === "merchant_order" && signature && signatureDate) {
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? ""
      const isValid = validateWebhookSignature(topic, apiVersion, id, signature, signatureDate, accessToken)

      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    if (topic === "payment") {
      const paymentId = data?.id ?? id
      const result = await processWebhookPayment(paymentId)

      if (!result.success) {
        console.error("Webhook payment error:", result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/mercadopago/webhook/route.ts
git commit -m "feat: add Mercado Pago webhook endpoint"
```

---

## Task 7: Criar Endpoint Consulta Payment

**Files:**
- Create: `app/api/mercadopago/payment/[id]/route.ts`

- [ ] **Step 1: Criar route consulta**

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getMercadoPagoClient } from "@/lib/mercadopago/client"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const mp = getMercadoPagoClient()
    const payment = await mp.payment.get(id)

    if (!payment || !payment.body) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json(payment.body)
  } catch (error) {
    console.error("Erro consultando payment:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/mercadopago/payment/[id]/route.ts
git commit -m "feat: add Mercado Pago payment status endpoint"
```

---

## Task 8: Atualizar Checkout Route (Substituir Stripe)

**Files:**
- Modify: `app/api/checkout/route.ts`

- [ ] **Step 1: Substituir imports Stripe por MP**

```typescript
// REMOVER:
// import type Stripe from "stripe"
// import { getStripeServerClient, ... } from "@/lib/stripe"

// ADICIONAR:
import { getMercadoPagoClient, isMercadoPagoConfigured } from "@/lib/mercadopago/client"
import { generateQrCodeBase64 } from "@/lib/mercadopago/pix"
import type { MercadoPagoCreatePreferenceRequest, MercadoPagoCreatePreferenceResponse } from "@/lib/mercadopago/types"
```

- [ ] **Step 2: Substituir bloco STRIPE_CARD por MERCADO_PAGO_CARD**

```typescript
// SUBSTITUIR TODO O BLOCO "if (payload.paymentMethod === "STRIPE_CARD")" por:

if (payload.paymentMethod === "MERCADO_PAGO_CARD") {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: "Mercado Pago não configurado neste ambiente." },
      { status: 503 },
    )
  }

  const mp = getMercadoPagoClient()
  let total = 0
  let totalWeightKg = 0
  const orderItemsRecord: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = []
  const mpItems: MercadoPagoCreatePreferenceRequest["items"] = []

  for (const item of resolvedItems) {
    const priceToUse = item.product.price.toNumber()
    const unitCost = item.product.costPrice?.toNumber() ?? null
    const categoryName = item.product.category.parent?.name ?? item.product.category.name
    const subcategoryName = item.product.category.parent ? item.product.category.name : null

    total += priceToUse * item.quantity
    totalWeightKg += (item.product.weightKg ?? 0.5) * item.quantity

    orderItemsRecord.push({
      productId: item.product.id,
      productVariantId: item.variant.id,
      quantity: item.quantity,
      price: priceToUse,
      unitPrice: priceToUse,
      unitCost,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      selectedFlavor: item.selectedFlavor,
      productNameSnapshot: item.product.name,
      productSlugSnapshot: item.product.slug,
      categoryNameSnapshot: categoryName,
      subcategoryNameSnapshot: subcategoryName,
      variantNameSnapshot: item.variant.name ?? null,
    })

    mpItems.push({
      id: item.product.id,
      title: item.variantLabel
        ? `${item.product.name} (${item.variantLabel})`
        : item.product.name,
      quantity: item.quantity,
      currency_id: "BRL",
      unit_price: priceToUse,
    })
  }

  // ... (shipping cost igual ao atual)

  const order = await prisma.$transaction(async (tx) => {
    const orderCreatedAt = new Date()
    const { orderNumber } = await allocateOrderNumber(tx, {
      channel: OrderChannel.ONLINE,
      createdAt: orderCreatedAt,
    })

    return tx.order.create({
      data: {
        userId,
        channel: OrderChannel.ONLINE,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: orderCreatedAt,
        orderNumber,
        total,
        customerNameSnapshot: sessionAuth.user?.name ?? null,
        customerEmailSnapshot: sessionAuth.user?.email ?? null,
        customerPhoneSnapshot: sessionAuth.user?.phone ?? null,
        shippingType: payload.shippingType,
        shippingCost: resolvedShippingCost,
        shippingCarrier: resolvedShippingCarrier,
        shippingDeadline: resolvedShippingDeadline,
        ...(payload.shippingType !== ShippingType.PICKUP ? normalizedAddress : {}),
        items: {
          create: orderItemsRecord,
        },
      },
    })
  })

  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL

  const preferencePayload: MercadoPagoCreatePreferenceRequest = {
    items: mpItems,
    external_reference: order.id,
    auto_return: "approved",
    back_urls: {
      success: `${origin}/checkout/success?order_id=${order.id}`,
      failure: `${origin}/checkout/cancel`,
      pending: `${origin}/checkout/success?order_id=${order.id}`,
    },
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber ?? "",
      userId,
      shippingType: payload.shippingType,
    },
  }

  const preference = await mp.preference.create({ body: preferencePayload })
  const preferenceData = preference.body as MercadoPagoCreatePreferenceResponse

  await prisma.order.update({
    where: { id: order.id },
    data: { mercadoPagoPreferenceId: preferenceData.id },
  })

  return NextResponse.json({
    preferenceId: preferenceData.id,
    initPoint: preferenceData.sandbox_init_point ?? preferenceData.init_point,
  })
}
```

- [ ] **Step 3: Adicionar novo payment method MERCADO_PAGO_PIX**

```typescript
// ADICIONAR NOVO BLOCO APÓS MERCADO_PAGO_CARD:

if (payload.paymentMethod === "MERCADO_PAGO_PIX") {
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: "Mercado Pago não configurado neste ambiente." },
      { status: 503 },
    )
  }

  const mp = getMercadoPagoClient()
  let total = 0
  let totalWeightKg = 0
  const orderItemsRecord: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = []
  const mpItems: MercadoPagoCreatePreferenceRequest["items"] = []

  for (const item of resolvedItems) {
    const priceToUse = item.product.price.toNumber()
    const unitCost = item.product.costPrice?.toNumber() ?? null
    const categoryName = item.product.category.parent?.name ?? item.product.category.name
    const subcategoryName = item.product.category.parent ? item.product.category.name : null

    total += priceToUse * item.quantity
    totalWeightKg += (item.product.weightKg ?? 0.5) * item.quantity

    orderItemsRecord.push({
      productId: item.product.id,
      productVariantId: item.variant.id,
      quantity: item.quantity,
      price: priceToUse,
      unitPrice: priceToUse,
      unitCost,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      selectedFlavor: item.selectedFlavor,
      productNameSnapshot: item.product.name,
      productSlugSnapshot: item.product.slug,
      categoryNameSnapshot: categoryName,
      subcategoryNameSnapshot: subcategoryName,
      variantNameSnapshot: item.variant.name ?? null,
    })

    mpItems.push({
      id: item.product.id,
      title: item.variantLabel
        ? `${item.product.name} (${item.variantLabel})`
        : item.product.name,
      quantity: item.quantity,
      currency_id: "BRL",
      unit_price: priceToUse,
    })
  }

  // ... shipping cost igual

  const order = await prisma.$transaction(async (tx) => {
    const orderCreatedAt = new Date()
    const { orderNumber } = await allocateOrderNumber(tx, {
      channel: OrderChannel.ONLINE,
      createdAt: orderCreatedAt,
    })

    return tx.order.create({
      data: {
        userId,
        channel: OrderChannel.ONLINE,
        paymentMethod: PaymentMethod.PIX,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: orderCreatedAt,
        orderNumber,
        total,
        customerNameSnapshot: sessionAuth.user?.name ?? null,
        customerEmailSnapshot: sessionAuth.user?.email ?? null,
        customerPhoneSnapshot: sessionAuth.user?.phone ?? null,
        shippingType: payload.shippingType,
        shippingCost: resolvedShippingCost,
        shippingCarrier: resolvedShippingCarrier,
        shippingDeadline: resolvedShippingDeadline,
        ...(payload.shippingType !== ShippingType.PICKUP ? normalizedAddress : {}),
        items: {
          create: orderItemsRecord,
        },
      },
    })
  })

  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL

  const preferencePayload: MercadoPagoCreatePreferenceRequest = {
    items: mpItems,
    external_reference: order.id,
    payment_methods: {
      excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
    },
    auto_return: "approved",
    back_urls: {
      success: `${origin}/checkout/success?order_id=${order.id}`,
      failure: `${origin}/checkout/cancel`,
      pending: `${origin}/checkout/success?order_id=${order.id}`,
    },
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber ?? "",
      userId,
      shippingType: payload.shippingType,
    },
  }

  const preference = await mp.preference.create({ body: preferencePayload })
  const preferenceData = preference.body as MercadoPagoCreatePreferenceResponse

  // Gerar QR code Pix
  const paymentRequest = {
    transaction_amount: total,
    payment_method_id: "pix",
    payer: {
      email: sessionAuth.user?.email ?? "",
    },
    external_reference: order.id,
  }

  const payment = await mp.payment.create({ body: paymentRequest })
  const paymentData = payment.body

  // Gerar QR code
  const pointOfInterface = (paymentData as any).point_of_interaction?.transaction_data?.qr_code
  const qrCodeText = (paymentData as any).point_of_interaction?.transaction_data?.qr_code_base64

  let qrCodeBase64: string | null = null
  if (pointOfInterface) {
    qrCodeBase64 = await generateQrCodeBase64(pointOfInterface)
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      mercadoPagoPreferenceId: preferenceData.id,
      mercadoPagoPaymentId: String(paymentData.id),
    },
  })

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentId: String(paymentData.id),
    qrCode: pointOfInterface,
    qrCodeBase64,
    redirectUrl: `/checkout/success?order_id=${order.id}&payment_id=${paymentData.id}`,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/route.ts
git commit -m "feat: replace Stripe with Mercado Pago in checkout"
```

---

## Task 9: Criar Componente QR Code Display

**Files:**
- Create: `app/checkout/pix/QrCodeDisplay.tsx`

- [ ] **Step 1: Criar componente**

```typescript
"use client"

import { useState } from "react"
import { Copy, Check, LoaderCircle } from "lucide-react"

type QrCodeDisplayProps = {
  qrCodeBase64: string | null
  qrCodeText: string
  amount: number
  onCopied?: () => void
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

export default function QrCodeDisplay({
  qrCodeBase64,
  qrCodeText,
  amount,
  onCopied,
}: QrCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText)
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Erro ao copiar:", err)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">
          Valor a pagar
        </p>
        <p className="text-3xl font-heading text-[var(--color-primary)]">
          {formatCurrency(amount)}
        </p>
      </div>

      {qrCodeBase64 ? (
        <div className="bg-white p-4 rounded-sm">
          <img
            src={qrCodeBase64}
            alt="QR Code Pix"
            className="w-64 h-64 object-contain"
          />
        </div>
      ) : (
        <div className="w-64 h-64 bg-white/5 flex items-center justify-center rounded-sm">
          <LoaderCircle className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
          Copie o código Pix
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-sm hover:border-white/30 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-white" />
              <span className="text-sm text-white">Copiar código</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center max-w-xs">
        Use o app do seu banco para escanear o QR code ou cole o código copiado.
        O pagamento será confirmado automaticamente.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/checkout/pix/QrCodeDisplay.tsx
git commit -m "feat: add Pix QR code display component"
```

---

## Task 10: Atualizar CheckoutPageClient (UI)

**Files:**
- Modify: `app/checkout/CheckoutPageClient.tsx`

- [ ] **Step 1: Substituir payment method types**

```typescript
// MUDAR:
type PublicCheckoutPaymentMethod = "STRIPE_CARD" | "MANUAL_PIX" | "CASH"
// PARA:
type PublicCheckoutPaymentMethod = "MERCADO_PAGO_CARD" | "MERCADO_PAGO_PIX" | "CASH"
```

- [ ] **Step 2: Atualizar labels**

```typescript
// MUDAR getPaymentActionLabel:
function getPaymentActionLabel(paymentMethod: PublicCheckoutPaymentMethod) {
  if (paymentMethod === "MERCADO_PAGO_PIX") {
    return "Gerar QR Code Pix"
  }
  if (paymentMethod === "MERCADO_PAGO_CARD") {
    return "Pagar com cartão"
  }
  if (paymentMethod === "CASH") {
    return "Confirmar pedido em dinheiro"
  }
  return "Confirmar"
}
```

- [ ] **Step 3: Substituir Stripe UI por Mercado Pago UI**

```typescript
// SUBSTITUIR o label STRIPE_CARD:
<label
  className={`block cursor-pointer rounded-sm border p-4 transition-colors ${
    paymentMethod === "MERCADO_PAGO_CARD"
      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
      : "border-white/10 hover:border-white/30"
  }`}
>
  <input
    type="radio"
    name="payment-method"
    value="MERCADO_PAGO_CARD"
    checked={paymentMethod === "MERCADO_PAGO_CARD"}
    onChange={() => setPaymentMethod("MERCADO_PAGO_CARD")}
    className="hidden"
  />
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-bold uppercase tracking-widest text-white">Cartão de Crédito</p>
      <p className="mt-2 text-xs text-gray-400">
        Pague com segurança usando cartão de crédito via Mercado Pago.
      </p>
    </div>
    <CreditCard className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
  </div>
</label>

// SUBSTITUIR MANUAL_PIX por MERCADO_PAGO_PIX:
<label
  className={`block cursor-pointer rounded-sm border p-4 transition-colors ${
    paymentMethod === "MERCADO_PAGO_PIX"
      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
      : "border-white/10 hover:border-white/30"
  }`}
>
  <input
    type="radio"
    name="payment-method"
    value="MERCADO_PAGO_PIX"
    checked={paymentMethod === "MERCADO_PAGO_PIX"}
    onChange={() => setPaymentMethod("MERCADO_PAGO_PIX")}
    className="hidden"
  />
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm font-bold uppercase tracking-widest text-white">Pix Instantâneo</p>
      <p className="mt-2 text-xs text-gray-400">
        Pagamento instantâneo via Pix. Confirmação automática em segundos.
      </p>
    </div>
    <QrCode className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
  </div>
</label>
```

- [ ] **Step 4: Atualizar availablePaymentMethods**

```typescript
// MUDAR:
const availablePaymentMethods: PublicCheckoutPaymentMethod[] =
  shippingType === "NATIONAL"
    ? ["MERCADO_PAGO_CARD", "MERCADO_PAGO_PIX"]
    : ["MERCADO_PAGO_CARD", "MERCADO_PAGO_PIX", "CASH"]
```

- [ ] **Step 5: Atualizar validatePaymentSelection**

```typescript
// REMOVER validação de STRIPE e MANUAL_PIX
// ADICIONAR:
if (shippingType === "NATIONAL" && paymentMethod === "CASH") {
  return "Entrega nacional não aceita pagamento em dinheiro."
}
```

- [ ] **Step 6: Atualizar handleCheckout response handling**

```typescript
// NOVO BLOCO DEPOIS DE response.ok:
if (data.qrCode && data.qrCodeBase64) {
  // Mostrar QR code Pix
  router.push(`/checkout/success?order_id=${data.orderId}&qr_code=${encodeURIComponent(data.qrCode)}&qr_base64=${encodeURIComponent(data.qrCodeBase64)}`)
  return
}

if (data.initPoint) {
  // Redirecionar para Payment Brick
  window.location.href = data.initPoint
  return
}
```

- [ ] **Step 7: Commit**

```bash
git add app/checkout/CheckoutPageClient.tsx
git commit -m "feat: update checkout UI for Mercado Pago"
```

---

## Task 11: Atualizar Página de Sucesso

**Files:**
- Modify: `app/checkout/success/page.tsx`

- [ ] **Step 1: Adicionar display QR code Pix**

```typescript
// ADICIONAR estado para QR code:
const [qrCode, setQrCode] = useState<string | null>(null)
const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)

// ADICIONAR useEffect para ler query params:
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const qr = params.get("qr_code")
  const qrB64 = params.get("qr_base64")
  if (qr) setQrCode(qr)
  if (qrB64) setQrCodeBase64(qrB64)
}, [])

// ADICIONAR seção QR code no JSX:
{qrCode && qrCodeBase64 && (
  <QrCodeDisplay
    qrCodeBase64={qrCodeBase64}
    qrCodeText={qrCode}
    amount={order?.total ?? 0}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/checkout/success/page.tsx
git commit -m "feat: add Pix QR display on success page"
```

---

## Task 12: Atualizar Schema Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar campos Mercado Pago**

```prisma
// NO MODELO Order, ADICIONAR:
model Order {
  // ... campos existentes ...
  
  mercadoPagoPaymentId     String?
  mercadoPagoPreferenceId  String?
}
```

- [ ] **Step 2: Gerar migration**

```bash
npx prisma migrate dev --name add_mercadopago_fields
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Mercado Pago fields to Order model"
```

---

## Task 13: Deletar Arquivos Stripe

**Files:**
- Delete: `lib/stripe.ts`
- Delete: `lib/stripe-webhook.ts` (se existir)

- [ ] **Step 1: Deletar arquivos**

```bash
rm lib/stripe.ts
# Se existir:
rm lib/stripe-webhook.ts
```

- [ ] **Step 2: Commit**

```bash
git rm lib/stripe.ts lib/stripe-webhook.ts 2>/dev/null || git rm lib/stripe.ts
git commit -m "feat: remove Stripe integration files"
```

---

## Task 14: Atualizar Admin Settings

**Files:**
- Modify: `app/admin/settings/SettingsForm.tsx`

- [ ] **Step 1: Adicionar campos Mercado Pago**

```typescript
// ADICIONAR novos campos no formulário:
const [mercadoPagoActive, setMercadoPagoActive] = useState(settings.mercadoPagoActive ?? false)
const [mercadoPagoAccessToken, setMercadoPagoAccessToken] = useState(settings.mercadoPagoAccessToken ?? "")

// NO JSX, ADICIONAR seção:
<div className="space-y-4">
  <h3 className="text-lg font-heading tracking-wider uppercase">Mercado Pago</h3>
  
  <label className="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={mercadoPagoActive}
      onChange={(e) => setMercadoPagoActive(e.target.checked)}
      className="w-5 h-5"
    />
    <span className="text-sm">Ativar Mercado Pago</span>
  </label>

  <div>
    <label className="block text-sm text-gray-400 mb-2">
      Access Token
    </label>
    <input
      type="password"
      value={mercadoPagoAccessToken}
      onChange={(e) => setMercadoPagoAccessToken(e.target.value)}
      className="w-full rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
      placeholder="TEST-..."
    />
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/settings/SettingsForm.tsx
git commit -m "feat: add Mercado Pago settings to admin"
```

---

## Task 15: Testar Integração

**Files:**
- Test: `scripts/check-integrations.ts`

- [ ] **Step 1: Atualizar script de integração**

```typescript
// ADICIONAR check Mercado Pago:
function checkMercadoPago() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY
  
  console.log("\n📱 Mercado Pago:")
  if (accessToken) {
    console.log("  ✓ Access Token configurado")
  } else {
    console.log("  ✗ Access Token não configurado")
  }
  
  if (publicKey) {
    console.log("  ✓ Public Key configurado")
  } else {
    console.log("  ✗ Public Key não configurado")
  }
}
```

- [ ] **Step 2: Executar script**

```bash
npm run integrations:check
```

- [ ] **Step 3: Commit**

```bash
git add scripts/check-integrations.ts
git commit -m "test: add Mercado Pago to integration checks"
```

---

## Resumo de Commits

| Task | Mensagem |
|------|----------|
| 1 | deps: add mercadopago, remove stripe |
| 2 | feat: add Mercado Pago shared types |
| 3 | feat: add Mercado Pago client SDK wrapper |
| 4 | feat: add Pix QR code generation utilities |
| 5 | feat: add Mercado Pago webhook handler |
| 6 | feat: add Mercado Pago webhook endpoint |
| 7 | feat: add Mercado Pago payment status endpoint |
| 8 | feat: replace Stripe with Mercado Pago in checkout |
| 9 | feat: add Pix QR code display component |
| 10 | feat: update checkout UI for Mercado Pago |
| 11 | feat: add Pix QR display on success page |
| 12 | feat: add Mercado Pago fields to Order model |
| 13 | feat: remove Stripe integration files |
| 14 | feat: add Mercado Pago settings to admin |
| 15 | test: add Mercado Pago to integration checks |

---

## Self-Review Checklist

- [ ] Spec coverage: Todos os requisitos do design spec têm task corresponding?
- [ ] Placeholder scan: Sem TBD/TODO no plano?
- [ ] Type consistency: Tipos consistentes entre tasks?
- [ ] Dependencies: Tasks em ordem lógica?
- [ ] Commits atômicos: Cada task faz uma coisa?
