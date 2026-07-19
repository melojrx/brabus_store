# Cart Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `TASK-S1-STORE-01` by merging the visitor cart into the authenticated user cart after login or registration, with stock-safe quantities and simple user-facing feedback.

**Architecture:** Keep cart state local in Zustand and `localStorage`; no database or API is required for this feature. Add a pure merge helper in `lib/cart-merge.ts`, call it only during the `__guest__ -> userId` owner transition in `store/cartStore.ts`, and surface a short, dismissible feedback message from the provider layer.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Auth.js v5, Zustand persist middleware, Node test runner with `tsx`.

## Global Constraints

- Do not introduce Prisma schema changes or server-side cart persistence.
- Preserve the existing storage key `brabus-cart-storage`.
- Preserve the existing cart line identity rule: prefer `productVariantId`; otherwise use `productId + selectedSize + selectedColor + selectedFlavor`.
- Merge automatically; do not prompt the user to choose between carts.
- Clear the guest cart after a successful guest-to-user merge to prevent duplicate merges.
- Cap merged quantities by known stock and report adjusted lines in the merge feedback.
- Preserve checkout continuation through `callbackUrl=/checkout` across login and registration.
- Keep UX copy in Portuguese, short, and actionable.
- Run `npm test`, `npm run lint -- .`, and `npm run build` before completion.

---

## Files

- Create: `lib/cart-merge.ts`
- Create: `tests/cart-merge.test.ts`
- Modify: `store/cartStore.ts`
- Modify: `components/Providers.tsx`
- Modify: `app/auth/login/page.tsx`
- Modify: `app/auth/register/page.tsx`
- Modify: `docs/TASKS.md`

## Task 1: Pure Cart Merge Rules

**Files:**
- Create: `lib/cart-merge.ts`
- Create: `tests/cart-merge.test.ts`

**Interfaces:**
- Produces: `GUEST_CART_OWNER: "__guest__"`
- Produces: `getCartLineId(item: CartMergeLineIdentity): string`
- Produces: `normalizeCartItem<T extends CartMergeItem>(item: T): T & { lineId: string; productVariantId: string | null }`
- Produces: `mergeCartItems<T extends CartMergeItem>(userItems: readonly T[], guestItems: readonly T[]): CartMergeResult<T>`

- [ ] **Step 1: Write the failing merge tests**

Create `tests/cart-merge.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  getCartLineId,
  mergeCartItems,
  normalizeCartItem,
  type CartMergeItem,
} from "../lib/cart-merge"

function item(input: Partial<CartMergeItem> & Pick<CartMergeItem, "productId" | "productName">): CartMergeItem {
  return {
    productId: input.productId,
    productSlug: input.productSlug,
    productName: input.productName,
    price: input.price ?? 10,
    quantity: input.quantity ?? 1,
    image: input.image,
    stock: input.stock ?? 10,
    productVariantId: input.productVariantId ?? null,
    variantName: input.variantName ?? null,
    selectedSize: input.selectedSize,
    selectedColor: input.selectedColor,
    selectedFlavor: input.selectedFlavor,
    lineId: input.lineId,
  }
}

test("uses variant id as the stable cart line id", () => {
  assert.equal(
    getCartLineId(item({ productId: "p1", productName: "Creatina", productVariantId: "v1" })),
    "variant:v1",
  )
})

test("falls back to product and selected attributes for products without variant id", () => {
  assert.equal(
    getCartLineId(
      item({
        productId: "p1",
        productName: "Camisa",
        selectedSize: "M",
        selectedColor: "Preto",
      }),
    ),
    "product:p1:M:Preto:",
  )
})

test("normalizes missing line and nullable variant fields", () => {
  const normalized = normalizeCartItem(
    item({
      productId: "p1",
      productName: "Whey",
      productVariantId: undefined,
      selectedFlavor: "Baunilha",
    }),
  )

  assert.equal(normalized.productVariantId, null)
  assert.equal(normalized.lineId, "product:p1:::Baunilha")
})

test("adds guest-only items to the authenticated user cart", () => {
  const result = mergeCartItems(
    [item({ productId: "p1", productName: "Creatina", productVariantId: "v1", quantity: 1 })],
    [item({ productId: "p2", productName: "Whey", productVariantId: "v2", quantity: 2 })],
  )

  assert.equal(result.items.length, 2)
  assert.equal(result.mergedItemCount, 2)
  assert.deepEqual(result.adjustedItems, [])
  assert.equal(result.items.find((line) => line.productId === "p2")?.quantity, 2)
})

test("sums duplicate guest and user lines by variant", () => {
  const result = mergeCartItems(
    [item({ productId: "p1", productName: "Creatina", productVariantId: "v1", quantity: 1, stock: 5 })],
    [item({ productId: "p1", productName: "Creatina", productVariantId: "v1", quantity: 2, stock: 5 })],
  )

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].quantity, 3)
  assert.equal(result.mergedItemCount, 2)
  assert.deepEqual(result.adjustedItems, [])
})

test("caps duplicate quantities by known stock and reports the adjustment", () => {
  const result = mergeCartItems(
    [item({ productId: "p1", productName: "Creatina", productVariantId: "v1", quantity: 4, stock: 5 })],
    [item({ productId: "p1", productName: "Creatina", productVariantId: "v1", quantity: 3, stock: 5 })],
  )

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].quantity, 5)
  assert.deepEqual(result.adjustedItems, [
    {
      lineId: "variant:v1",
      productName: "Creatina",
      requestedQuantity: 7,
      availableStock: 5,
    },
  ])
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```bash
node --import tsx --test tests/cart-merge.test.ts
```

Expected: FAIL because `../lib/cart-merge` does not exist.

- [ ] **Step 3: Implement the pure merge helper**

Create `lib/cart-merge.ts`:

```ts
export const GUEST_CART_OWNER = "__guest__"

export type CartMergeLineIdentity = {
  productId: string
  productVariantId?: string | null
  selectedSize?: string
  selectedColor?: string
  selectedFlavor?: string
}

export type CartMergeItem = CartMergeLineIdentity & {
  lineId?: string
  productSlug?: string
  productName: string
  price: number
  quantity: number
  image?: string
  stock: number
  variantName?: string | null
}

export type CartMergeAdjustment = {
  lineId: string
  productName: string
  requestedQuantity: number
  availableStock: number
}

export type CartMergeResult<T extends CartMergeItem> = {
  items: Array<T & { lineId: string; productVariantId: string | null }>
  mergedItemCount: number
  adjustedItems: CartMergeAdjustment[]
}

export function getCartLineId(item: CartMergeLineIdentity) {
  if (item.productVariantId) {
    return `variant:${item.productVariantId}`
  }

  return [
    "product",
    item.productId,
    item.selectedSize ?? "",
    item.selectedColor ?? "",
    item.selectedFlavor ?? "",
  ].join(":")
}

export function normalizeCartItem<T extends CartMergeItem>(
  item: T,
): T & { lineId: string; productVariantId: string | null } {
  return {
    ...item,
    lineId: item.lineId ?? getCartLineId(item),
    productSlug: item.productSlug ?? undefined,
    productVariantId: item.productVariantId ?? null,
    variantName: item.variantName ?? null,
    selectedSize: item.selectedSize ?? undefined,
    selectedColor: item.selectedColor ?? undefined,
    selectedFlavor: item.selectedFlavor ?? undefined,
  }
}

export function mergeCartItems<T extends CartMergeItem>(
  userItems: readonly T[],
  guestItems: readonly T[],
): CartMergeResult<T> {
  const adjustedItems: CartMergeAdjustment[] = []
  const linesById = new Map<string, T & { lineId: string; productVariantId: string | null }>()

  for (const userItem of userItems) {
    const normalized = normalizeCartItem(userItem)
    linesById.set(normalized.lineId, normalized)
  }

  let mergedItemCount = 0

  for (const guestItem of guestItems) {
    const normalizedGuestItem = normalizeCartItem(guestItem)
    mergedItemCount += normalizedGuestItem.quantity

    const existingItem = linesById.get(normalizedGuestItem.lineId)

    if (!existingItem) {
      linesById.set(normalizedGuestItem.lineId, normalizedGuestItem)
      continue
    }

    const requestedQuantity = existingItem.quantity + normalizedGuestItem.quantity
    const availableStock = Math.max(0, Math.min(existingItem.stock, normalizedGuestItem.stock))
    const quantity = Math.min(requestedQuantity, availableStock)

    if (quantity < requestedQuantity) {
      adjustedItems.push({
        lineId: existingItem.lineId,
        productName: existingItem.productName,
        requestedQuantity,
        availableStock,
      })
    }

    linesById.set(existingItem.lineId, {
      ...existingItem,
      quantity,
      stock: availableStock,
    })
  }

  return {
    items: Array.from(linesById.values()),
    mergedItemCount,
    adjustedItems,
  }
}
```

- [ ] **Step 4: Run the merge tests**

Run:

```bash
node --import tsx --test tests/cart-merge.test.ts
```

Expected: PASS for all tests in `tests/cart-merge.test.ts`.

- [ ] **Step 5: Commit Task 1**

```bash
git add lib/cart-merge.ts tests/cart-merge.test.ts
git commit -m "feat: add cart merge rules"
```

## Task 2: Zustand Owner Sync Merge

**Files:**
- Modify: `store/cartStore.ts`

**Interfaces:**
- Consumes: `GUEST_CART_OWNER`, `mergeCartItems`, `normalizeCartItem`, `CartMergeAdjustment` from `lib/cart-merge.ts`
- Produces: `lastMergeNotice: CartMergeNotice | null`
- Produces: `dismissMergeNotice(): void`
- Updates: `syncCartOwner(userId?: string | null): void`

- [ ] **Step 1: Write the store-facing type changes**

Modify imports and types in `store/cartStore.ts`:

```ts
import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  GUEST_CART_OWNER,
  mergeCartItems,
  normalizeCartItem,
  type CartMergeAdjustment,
} from "@/lib/cart-merge"
```

Replace the local `GUEST_CART_OWNER`, `normalizeCartLineId`, `normalizeCartItem`, and `normalizeCartItems` definitions with:

```ts
function normalizeCartItems(items: CartItem[] | undefined) {
  return Array.isArray(items) ? items.map((item) => normalizeCartItem(item)) : []
}
```

Add the notice type:

```ts
type CartMergeNotice = {
  mergedItemCount: number
  adjustedItems: CartMergeAdjustment[]
}
```

Extend `CartState`:

```ts
interface CartState {
  items: CartItem[]
  ownerKey: string
  cartsByOwner: Record<string, CartItem[]>
  hasHydrated: boolean
  lastMergeNotice: CartMergeNotice | null
  setHasHydrated: (value: boolean) => void
  addItem: (item: CartItem) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
  syncCartOwner: (userId?: string | null) => void
  dismissMergeNotice: () => void
  getTotal: () => number
  getItemCount: () => number
}
```

- [ ] **Step 2: Run type check to expose incomplete implementation**

Run:

```bash
npm run build
```

Expected: FAIL because `lastMergeNotice` and `dismissMergeNotice` are declared in `CartState` but not fully initialized in the Zustand store yet.

- [ ] **Step 3: Implement guest-to-user merge in `syncCartOwner`**

In the store initializer, add:

```ts
lastMergeNotice: null,
```

Add the action:

```ts
dismissMergeNotice: () => set({ lastMergeNotice: null }),
```

Replace `syncCartOwner` with:

```ts
syncCartOwner: (userId) => set((state) => {
  const nextOwnerKey = resolveCartOwnerKey(userId)

  if (state.ownerKey === nextOwnerKey) {
    return state
  }

  const currentItems = normalizeCartItems(state.items)
  const nextCartsByOwner = {
    ...state.cartsByOwner,
    [state.ownerKey]: currentItems,
  }

  if (state.ownerKey === GUEST_CART_OWNER && nextOwnerKey !== GUEST_CART_OWNER) {
    const guestItems = currentItems
    const userItems = normalizeCartItems(nextCartsByOwner[nextOwnerKey])

    if (guestItems.length > 0) {
      const mergeResult = mergeCartItems(userItems, guestItems)

      return {
        ownerKey: nextOwnerKey,
        items: mergeResult.items,
        cartsByOwner: {
          ...nextCartsByOwner,
          [GUEST_CART_OWNER]: [],
          [nextOwnerKey]: mergeResult.items,
        },
        lastMergeNotice: {
          mergedItemCount: mergeResult.mergedItemCount,
          adjustedItems: mergeResult.adjustedItems,
        },
      }
    }
  }

  const nextItems = normalizeCartItems(nextCartsByOwner[nextOwnerKey])

  return {
    ownerKey: nextOwnerKey,
    items: nextItems,
    cartsByOwner: nextCartsByOwner,
    lastMergeNotice: null,
  }
}),
```

Update `migrate` fallback objects to include:

```ts
lastMergeNotice: null,
```

Keep `partialize` unchanged except do not persist `lastMergeNotice`.

- [ ] **Step 4: Run validation for the store change**

Run:

```bash
npm test
npm run lint -- store/cartStore.ts
```

Expected: tests PASS and lint PASS for `store/cartStore.ts`.

- [ ] **Step 5: Commit Task 2**

```bash
git add store/cartStore.ts
git commit -m "feat: merge guest cart on login"
```

## Task 3: User-Facing Merge Feedback

**Files:**
- Modify: `components/Providers.tsx`

**Interfaces:**
- Consumes: `lastMergeNotice` and `dismissMergeNotice` from `useCartStore`
- Produces: a fixed, dismissible feedback region shown only after a merge

- [ ] **Step 1: Add cart merge feedback component**

Modify `components/Providers.tsx` to include:

```tsx
function CartMergeFeedback() {
  const lastMergeNotice = useCartStore((state) => state.lastMergeNotice)
  const dismissMergeNotice = useCartStore((state) => state.dismissMergeNotice)

  useEffect(() => {
    if (!lastMergeNotice) {
      return
    }

    const timeoutId = window.setTimeout(dismissMergeNotice, 7000)
    return () => window.clearTimeout(timeoutId)
  }, [dismissMergeNotice, lastMergeNotice])

  if (!lastMergeNotice) {
    return null
  }

  const adjusted = lastMergeNotice.adjustedItems.length > 0

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-md rounded-sm border border-[var(--color-primary)]/30 bg-zinc-950/95 p-4 text-sm text-white shadow-2xl backdrop-blur md:left-auto md:right-6 md:mx-0">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-bold text-[var(--color-primary)]">Carrinho atualizado</p>
          <p className="text-zinc-300">
            Incluímos os itens que você já tinha escolhido antes de entrar.
          </p>
          {adjusted ? (
            <p className="text-xs text-amber-300">
              Ajustamos algumas quantidades conforme o estoque disponível.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismissMergeNotice}
          className="shrink-0 rounded-sm border border-white/10 px-2 py-1 text-xs font-bold uppercase tracking-widest text-zinc-300 transition-colors hover:border-white/30 hover:text-white"
        >
          OK
        </button>
      </div>
    </div>
  )
}
```

Render it under `CartSessionSync`:

```tsx
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartSessionSync />
      <CartMergeFeedback />
      {children}
    </SessionProvider>
  )
}
```

- [ ] **Step 2: Run lint for provider feedback**

Run:

```bash
npm run lint -- components/Providers.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit Task 3**

```bash
git add components/Providers.tsx
git commit -m "feat: show cart merge feedback"
```

## Task 4: Checkout Continuity Through Login and Registration

**Files:**
- Modify: `app/auth/login/page.tsx`
- Modify: `app/auth/register/page.tsx`

**Interfaces:**
- Consumes: `callbackUrl` query parameter
- Produces: login-to-register links that preserve `callbackUrl`
- Produces: registration redirect back to login with the same `callbackUrl`

- [ ] **Step 1: Preserve `callbackUrl` from login to registration**

In `app/auth/login/page.tsx`, add:

```tsx
const registerHref = callbackUrl
  ? `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
  : "/auth/register"
```

Replace the create-account link with:

```tsx
<Link href={registerHref} className="text-[var(--color-primary)] hover:underline font-bold">
  Criar conta
</Link>
```

- [ ] **Step 2: Preserve `callbackUrl` after registration**

In `app/auth/register/page.tsx`, import `useSearchParams` and `Suspense`:

```tsx
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
```

Move the current component body into `RegisterForm`, read the callback, and redirect after successful registration:

```tsx
function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const loginHref = callbackUrl
    ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/auth/login"
}
```

Keep the existing `name`, `email`, `phone`, `password`, `error`, and `loading` state declarations inside `RegisterForm`. Keep the existing `/api/auth/register` request body and error handling unchanged in this task.

Replace the successful redirect:

```tsx
router.push(`/auth/login?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`)
```

Replace the existing login link:

```tsx
<Link href={loginHref} className="text-[var(--color-primary)] hover:underline font-bold">
  Entrar
</Link>
```

Export the page with `Suspense`, matching the login page pattern:

```tsx
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="w-full max-w-md rounded-sm border border-white/10 bg-black/40 p-8 text-center text-sm text-gray-400">
            Carregando cadastro...
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
```

- [ ] **Step 3: Run route lint**

Run:

```bash
npm run lint -- app/auth/login/page.tsx app/auth/register/page.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit Task 4**

```bash
git add app/auth/login/page.tsx app/auth/register/page.tsx
git commit -m "feat: preserve checkout auth return path"
```

## Task 5: Task Tracking and End-to-End Validation

**Files:**
- Modify: `docs/TASKS.md`

**Interfaces:**
- Consumes: implemented behavior from Tasks 1-4
- Produces: updated task checklist for `TASK-S1-STORE-01` and `TASK-S1-STORE-02`

- [ ] **Step 1: Update the Sprint 1 checklist**

In `docs/TASKS.md`, mark the implemented cart merge items:

```md
#### TASK-S1-STORE-01 — Merge de carrinho entre visitante e usuario

- [x] Definir regra de merge entre carrinho `guest` e carrinho autenticado
- [x] Ajustar sincronizacao ao trocar `ownerKey`
- [x] Tratar itens duplicados por variante
- [x] Respeitar limite de estoque durante merge
```

Also update the registration continuation lines:

```md
#### TASK-S1-STORE-02 — Continuidade da jornada de login e cadastro

- [x] Revisar `callbackUrl` no login
- [x] Revisar fluxo de cadastro para retorno ao checkout
- [x] Exibir feedback claro de continuidade da jornada
- [ ] Validar manualmente login e cadastro com carrinho existente
```

- [ ] **Step 2: Run automated verification**

Run:

```bash
npm test
npm run lint -- .
npm run build
```

Expected:
- `npm test`: PASS
- `npm run lint -- .`: exit code 0; the current baseline may still show warnings in `app/admin/integrations/webhooks/[id]/DeliveriesManager.tsx` and `app/checkout/pix/QrCodeDisplay.tsx`
- `npm run build`: PASS

- [ ] **Step 3: Run manual validation**

Use the local app with:

```bash
npm run dev
```

Validate these flows:

- Visitor adds product variant A with quantity 1, logs in from `/checkout`, and sees variant A still in the cart.
- Visitor adds variant A with quantity 2, authenticated cart already has variant A with quantity 1, login results in quantity 3.
- Visitor adds variant A beyond known stock when authenticated cart already has the same variant; login caps quantity and shows the stock-adjustment copy.
- Visitor starts checkout, chooses “Criar conta”, completes registration, logs in, and lands back on `/checkout`.
- Logout after merge does not recreate the old guest cart.

- [ ] **Step 4: Commit Task 5**

```bash
git add docs/TASKS.md
git commit -m "docs: update cart merge task status"
```

## Self-Review

- Spec coverage: the plan covers automatic guest-to-user merge, duplicate variant handling, stock capping, guest cleanup, login/register continuity, feedback copy, and validation.
- Placeholder scan: the plan contains no placeholder tasks; all implementation steps include exact files, code, commands, and expected results.
- Type consistency: `CartMergeItem`, `CartMergeAdjustment`, `CartMergeResult`, `lastMergeNotice`, and `dismissMergeNotice` are introduced before later tasks consume them.
- Scope control: the plan does not add server-side cart persistence, database changes, account-level cart sync across devices, or checkout payment changes.
