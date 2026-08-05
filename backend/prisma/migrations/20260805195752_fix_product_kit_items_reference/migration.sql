-- AlterTable
ALTER TABLE "product_kit_items" DROP COLUMN "description",
DROP COLUMN "image_url",
DROP COLUMN "title",
ADD COLUMN     "item_product_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "is_kit";

-- CreateIndex
CREATE UNIQUE INDEX "product_kit_items_product_id_item_product_id_key" ON "product_kit_items"("product_id", "item_product_id");

-- AddForeignKey
ALTER TABLE "product_kit_items" ADD CONSTRAINT "product_kit_items_item_product_id_fkey" FOREIGN KEY ("item_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
