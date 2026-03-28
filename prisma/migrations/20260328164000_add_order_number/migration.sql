ALTER TABLE "orders"
ADD COLUMN "orderNumber" TEXT;

CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

CREATE TABLE "order_number_counters" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_number_counters_dateKey_channel_key"
ON "order_number_counters"("dateKey", "channel");
