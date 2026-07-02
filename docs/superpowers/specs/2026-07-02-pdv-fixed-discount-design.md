# PDV Fixed Discount Design

## Context

The Brabu's Store PDV lets staff create in-store orders with cash, manual Pix,
debit card, and credit card payments. Today the amount due is calculated from
items plus shipping, without any cashier-controlled discount.

This feature adds a fixed discount in Brazilian reais only to PDV orders. It
does not change public checkout, Mercado Pago checkout, online manual orders,
product prices, or item snapshots.

## Goals

- Let staff enter a fixed discount amount in the PDV checkout summary.
- Show subtotal, shipping, discount, and final amount due before payment.
- Persist the discount on the order for admin review and future reporting.
- Keep `Order.total` as the final net amount paid by the customer.
- Keep the implementation small, explicit, and limited to PDV order creation.

## Non-Goals

- No percentage discounts.
- No coupons, approval workflow, discount reasons, or per-item discounts.
- No public storefront or online checkout discount support.
- No retroactive recalculation of old orders.

## Behavior

The PDV will expose one money input labeled as a discount in reais. Empty input
means no discount. A discount of `0` is allowed and behaves like no discount.

The system will calculate:

- items subtotal from product variant prices and quantities;
- shipping cost from the selected delivery mode;
- discount amount from the PDV input;
- final total as `itemsSubtotal + shippingCost - discountAmount`.

The discount cannot be negative and cannot be greater than
`itemsSubtotal + shippingCost`. If the discount is invalid, the PDV must show a
clear validation error and block order creation.

For cash payments, change must be calculated against the final net total after
discount. For Pix and card payments, the displayed payable amount must also be
the final net total.

## Data Model

Add `discountAmount Decimal @default(0) @db.Decimal(10, 2)` to `Order`.

`Order.total` remains the final net total. Existing orders receive
`discountAmount = 0` through the migration default.

No separate subtotal column is required for this first version. The admin order
detail can continue deriving item subtotal from order items, then display the
persisted discount amount beside shipping and total.

## API and Domain Flow

`createPdvOrderSchema` accepts an optional `discountAmount` money field.

`app/api/admin/pdv/orders/route.ts` passes that value to `createManualOrder`.

`createManualOrder` accepts `discountAmount`, but applies it only when
`channel === OrderChannel.PDV`. Calls from the public checkout do not pass it and
continue to create orders with zero discount.

`createManualOrder` validates the discount after item subtotal and shipping are
known. It persists the discount and stores the final total in `Order.total`.

## UI Flow

In `PdvManager`, the current order summary gets a fixed-discount input near the
payment totals. The summary should show:

- products subtotal;
- shipping;
- discount;
- total to pay.

The final amount should be visually clear because staff will use it at the
counter. Validation should happen before submission and be repeated on the
server.

## Reporting and Admin Review

The admin order detail page shows the discount line when the value is greater
than zero. Order list totals remain net totals.

Dashboard revenue already uses `Order.total` for paid order totals, so it will
naturally reflect net revenue. Item-level gross revenue and margin reports still
use item snapshots and may remain gross for this first version. This is accepted
to avoid introducing discount allocation complexity before the business asks for
it.

## Verification

Automated unit tests should cover the PDV order calculation path with and
without discount, including invalid discount greater than the amount due and
cash change calculation after discount.

Manual validation should cover:

- PDV cash sale with discount and change;
- PDV Pix sale with discount;
- PDV card sale with discount;
- admin order detail displays discount and net total;
- public checkout remains unchanged.
