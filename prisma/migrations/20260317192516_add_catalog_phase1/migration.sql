-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportsColor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportsFlavor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportsSize" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportsWeight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trackStockByVariant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "categoryNameSnapshot" TEXT,
ADD COLUMN     "productNameSnapshot" TEXT,
ADD COLUMN     "productSlugSnapshot" TEXT,
ADD COLUMN     "productVariantId" TEXT,
ADD COLUMN     "selectedColor" TEXT,
ADD COLUMN     "subcategoryNameSnapshot" TEXT,
ADD COLUMN     "unitCost" DECIMAL(10,2),
ADD COLUMN     "unitPrice" DECIMAL(10,2),
ADD COLUMN     "variantNameSnapshot" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "costPrice" DECIMAL(10,2),
ADD COLUMN     "weightLabel" TEXT;

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT,
    "size" TEXT,
    "color" TEXT,
    "flavor" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_productVariantId_idx" ON "order_items"("productVariantId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
