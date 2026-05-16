-- AlterEnum: add SELLER to Role
ALTER TYPE "Role" ADD VALUE 'SELLER';

-- AlterTable: add mustChangePassword to users
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add userId to sellers
ALTER TABLE "sellers" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sellers_userId_key" ON "sellers"("userId");

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add sellerId to orders
ALTER TABLE "orders" ADD COLUMN "sellerId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
