BEGIN;

CREATE TYPE "PaymentMethod_new" AS ENUM (
  'MERCADO_PAGO_CARD',
  'MERCADO_PAGO_PIX',
  'CASH',
  'MANUAL_PIX',
  'POS_DEBIT',
  'POS_CREDIT'
);

ALTER TABLE "orders" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "orders"
ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new"
USING (
  CASE "paymentMethod"::text
    WHEN 'STRIPE_CARD' THEN 'MERCADO_PAGO_CARD'
    WHEN 'STRIPE_PIX' THEN 'MERCADO_PAGO_PIX'
    ELSE "paymentMethod"::text
  END
)::"PaymentMethod_new";

ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "PaymentMethod_old";
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" SET DEFAULT 'MERCADO_PAGO_CARD';

COMMIT;

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL_REFUNDED';

ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "mercadoPagoPaymentId" TEXT,
ADD COLUMN IF NOT EXISTS "mercadoPagoPreferenceId" TEXT;

ALTER TABLE "store_settings"
ADD COLUMN IF NOT EXISTS "mercadoPagoAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "mercadoPagoEnvironment" TEXT NOT NULL DEFAULT 'sandbox';
