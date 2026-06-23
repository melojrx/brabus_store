-- AlterTable
ALTER TABLE "categories" ADD COLUMN "trackExpiration" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "product_variants_expiresAt_idx" ON "product_variants"("expiresAt");

-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN "expiryWarningDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "store_settings" ADD COLUMN "expiryCriticalDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "store_settings" ADD COLUMN "expiryAlertsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "store_settings" ADD COLUMN "telegramBotToken" TEXT;
ALTER TABLE "store_settings" ADD COLUMN "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "expiry_alert_logs" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "alertLevel" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expiry_alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expiry_alert_logs_dateKey_idx" ON "expiry_alert_logs"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "expiry_alert_logs_variantId_alertLevel_dateKey_key" ON "expiry_alert_logs"("variantId", "alertLevel", "dateKey");

-- AddForeignKey
ALTER TABLE "expiry_alert_logs" ADD CONSTRAINT "expiry_alert_logs_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
