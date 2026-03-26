CREATE TYPE "OrderChannel" AS ENUM ('ONLINE', 'PDV', 'LEGACY');

ALTER TABLE "orders"
ADD COLUMN "channel" "OrderChannel" NOT NULL DEFAULT 'LEGACY';
