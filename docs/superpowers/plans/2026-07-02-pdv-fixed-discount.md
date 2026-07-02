# PDV Fixed Discount Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed reais discount to PDV order creation while keeping public checkout unchanged.

**Architecture:** Put discount math in a small pure helper and test it directly. Persist the discount on `Order`, keep `Order.total` as the final net total, and wire the PDV UI/API through the existing `createManualOrder` flow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 5, Zod, Node test runner with `tsx`.

---

## Files

- Create: `lib/order-discount.ts` for pure discount validation and net total calculation.
- Create: `tests/order-discount.test.ts` for RED/GREEN coverage of the money rule.
- Modify: `package.json` to add a focused `test` script.
- Modify: `prisma/schema.prisma` and add a Prisma migration for `Order.discountAmount`.
- Modify: `lib/pdv.ts` to accept optional `discountAmount` only from PDV payloads.
- Modify: `lib/manual-orders.ts` to apply the discount when creating PDV orders.
- Modify: `app/api/admin/pdv/orders/route.ts` to pass the PDV discount into the domain service.
- Modify: `app/admin/pdv/PdvManager.tsx` to show and submit discount and net total.
- Modify: `lib/admin-orders.ts` and `app/admin/orders/[id]/page.tsx` to display persisted discounts in admin order detail.

## Task 1: Test Discount Math

- [ ] Create `tests/order-discount.test.ts` with Node test runner cases:
  - no discount keeps net total equal to gross total;
  - valid fixed discount reduces the net total;
  - discount greater than gross total throws a business error;
  - cash change calculation uses net total.

- [ ] Run the focused test and verify RED:

```bash
node --import tsx --test tests/order-discount.test.ts
```

Expected: fail because `lib/order-discount.ts` does not exist.

- [ ] Create `lib/order-discount.ts` with:
  - `normalizeDiscountAmount(value)`;
  - `calculateDiscountedOrderTotal({ subtotal, shippingCost, discountAmount })`;
  - `calculateCashChange({ total, cashReceivedAmount })`.

- [ ] Run the focused test and verify GREEN:

```bash
node --import tsx --test tests/order-discount.test.ts
```

Expected: pass.

## Task 2: Persist Order Discount

- [ ] Add `discountAmount Decimal @default(0) @db.Decimal(10, 2)` to the `Order` model in `prisma/schema.prisma`.

- [ ] Add a migration like:

```sql
ALTER TABLE "orders" ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
```

- [ ] Run Prisma generate:

```bash
npm run prisma:generate
```

Expected: Prisma Client generation succeeds.

## Task 3: Wire API and Domain Service

- [ ] Extend `createPdvOrderSchema` in `lib/pdv.ts` with optional `discountAmount`.

- [ ] Extend `ManualOrderCreateInput` in `lib/manual-orders.ts` with optional `discountAmount`.

- [ ] In `createManualOrder`, compute subtotal and shipping first, normalize the discount only for `OrderChannel.PDV`, validate it against subtotal plus shipping, then persist:

```ts
discountAmount: appliedDiscountAmount,
total: finalTotal,
```

- [ ] Keep non-PDV callers at zero discount by default.

- [ ] Pass `payload.discountAmount` from `app/api/admin/pdv/orders/route.ts`.

## Task 4: Update PDV UI

- [ ] Add a `discountAmount` state to `PdvManager`.

- [ ] Compute:

```ts
const grossTotal = subtotal + shippingCost
const parsedDiscountAmount = parseCurrencyInputValue(discountAmount) ?? 0
const total = Math.max(0, grossTotal - parsedDiscountAmount)
```

- [ ] Validate on submit that discount is not greater than gross total and show a checkout feedback error if invalid.

- [ ] Add a fixed-discount input in the payment/summary area.

- [ ] Show subtotal, shipping, discount, and total to pay.

- [ ] Include `discountAmount` in the PDV order POST body.

- [ ] Reset `discountAmount` in `resetForm`.

## Task 5: Show Discount in Admin

- [ ] Include `discountAmount` in admin order serialization/detail types.

- [ ] In `app/admin/orders/[id]/page.tsx`, show a discount line in the summary when `discountAmount > 0`.

- [ ] Keep list totals as net `Order.total`.

## Task 6: Verify

- [ ] Run the focused discount test:

```bash
node --import tsx --test tests/order-discount.test.ts
```

- [ ] Run lint:

```bash
npm run lint -- .
```

- [ ] Run production build:

```bash
npm run build
```

- [ ] Manual checks:
  - PDV cash sale with discount and correct change.
  - PDV manual Pix sale with discount.
  - PDV debit/credit terminal sale with discount.
  - Admin order detail shows discount and net total.
  - Public checkout still has no discount field.

## Commit Plan

- [ ] Commit spec and plan docs.
- [ ] Commit tested implementation with author/sign-off:

```bash
git -c user.name="Junior Melo" -c user.email="jrmeloafrf@gmail.com" commit -s -m "feat(pdv): add fixed order discount"
```

- [ ] Do not push `main` until the feature is tested and approved, because pushing `main` triggers production deploy.
