-- CreateEnum
CREATE TYPE "CustomerReceivableStatus" AS ENUM ('OPEN', 'PARTIAL', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerCreditEventType" AS ENUM ('RECEIVABLE_CREATED', 'RECEIVABLE_CANCELLED', 'PAYMENT_RECORDED', 'PAYMENT_REVERSED', 'CREDIT_BLOCKED', 'CREDIT_UNBLOCKED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'FIADO';

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- AlterTable
ALTER TABLE "customers"
ADD COLUMN "creditBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "creditBlockedAt" TIMESTAMP(3),
ADD COLUMN "creditBlockedByUserId" TEXT,
ADD COLUMN "creditBlockedReason" TEXT;

ALTER TABLE "orders"
ADD COLUMN "customerId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "customer_receivables" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "openAmount" DECIMAL(10,2) NOT NULL,
    "status" "CustomerReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "settledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_receivables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_payments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedByUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_payment_allocations" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payment_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_credit_events" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "type" "CustomerCreditEventType" NOT NULL,
    "amount" DECIMAL(10,2),
    "orderId" TEXT,
    "receivableId" TEXT,
    "paymentId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_credit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_receivables_orderId_key" ON "customer_receivables"("orderId");
CREATE INDEX "customer_receivables_customerId_status_createdAt_idx" ON "customer_receivables"("customerId", "status", "createdAt");
CREATE UNIQUE INDEX "customer_payments_idempotencyKey_key" ON "customer_payments"("idempotencyKey");
CREATE INDEX "customer_payments_customerId_receivedAt_idx" ON "customer_payments"("customerId", "receivedAt");
CREATE INDEX "customer_payments_reversedByUserId_idx" ON "customer_payments"("reversedByUserId");
CREATE INDEX "customer_payment_allocations_receivableId_idx" ON "customer_payment_allocations"("receivableId");
CREATE UNIQUE INDEX "customer_payment_allocations_paymentId_receivableId_key" ON "customer_payment_allocations"("paymentId", "receivableId");
CREATE INDEX "customer_credit_events_customerId_createdAt_idx" ON "customer_credit_events"("customerId", "createdAt");
CREATE INDEX "customer_credit_events_actorUserId_idx" ON "customer_credit_events"("actorUserId");
CREATE INDEX "customers_creditBlockedByUserId_idx" ON "customers"("creditBlockedByUserId");
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_creditBlockedByUserId_fkey" FOREIGN KEY ("creditBlockedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_receivables" ADD CONSTRAINT "customer_receivables_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_receivables" ADD CONSTRAINT "customer_receivables_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_payment_allocations" ADD CONSTRAINT "customer_payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "customer_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_payment_allocations" ADD CONSTRAINT "customer_payment_allocations_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "customer_receivables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_credit_events" ADD CONSTRAINT "customer_credit_events_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_credit_events" ADD CONSTRAINT "customer_credit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
