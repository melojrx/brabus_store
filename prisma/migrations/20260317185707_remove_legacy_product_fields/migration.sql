-- AlterTable
ALTER TABLE "products"
DROP COLUMN "stock",
DROP COLUMN "productType",
DROP COLUMN "flavors",
DROP COLUMN "sizes",
DROP COLUMN "color";

-- DropEnum
DROP TYPE "ProductType";
