ALTER TABLE "products" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH ordered_products AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) - 1 AS position
  FROM "products"
)
UPDATE "products"
SET "sort_order" = ordered_products.position
FROM ordered_products
WHERE "products".id = ordered_products.id;
