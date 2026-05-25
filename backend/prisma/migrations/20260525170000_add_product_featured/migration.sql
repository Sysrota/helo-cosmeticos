-- AlterTable
ALTER TABLE "products" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- Only one product can be selected as the main home highlight.
CREATE UNIQUE INDEX "products_single_featured_idx"
ON "products" ("is_featured")
WHERE "is_featured" = true;
