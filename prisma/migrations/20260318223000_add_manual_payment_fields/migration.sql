CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE_CARD', 'STRIPE_PIX', 'CASH', 'MANUAL_PIX');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

ALTER TABLE "orders"
ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE_CARD',
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "manualPaymentReference" TEXT,
ADD COLUMN "manualPaymentNotes" TEXT,
ADD COLUMN "cashReceivedAmount" DECIMAL(10,2),
ADD COLUMN "changeAmount" DECIMAL(10,2);

UPDATE "orders"
SET "paymentStatus" = CASE
  WHEN "status" IN ('PAID', 'SHIPPED', 'DELIVERED') THEN 'PAID'::"PaymentStatus"
  WHEN "status" = 'FAILED' THEN 'FAILED'::"PaymentStatus"
  WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"PaymentStatus"
  WHEN "status" = 'REFUNDED' THEN 'REFUNDED'::"PaymentStatus"
  ELSE 'PENDING'::"PaymentStatus"
END;

UPDATE "orders"
SET "paidAt" = "updatedAt"
WHERE "paymentStatus" = 'PAID';

ALTER TABLE "store_settings"
ADD COLUMN "pixKey" TEXT;
