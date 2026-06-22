ALTER TABLE "orders"
  ADD COLUMN "order_number" TEXT;

CREATE TABLE "order_sequences" (
  "year" INTEGER NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_sequences_pkey" PRIMARY KEY ("year")
);

WITH numbered_orders AS (
  SELECT
    "id",
    EXTRACT(YEAR FROM "created_at")::INTEGER AS "order_year",
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM "created_at")::INTEGER
      ORDER BY "created_at", "id"
    ) AS "sequence"
  FROM "orders"
)
UPDATE "orders"
SET "order_number" =
  RIGHT(numbered_orders."order_year"::TEXT, 2) ||
  LPAD(numbered_orders."sequence"::TEXT, 4, '0')
FROM numbered_orders
WHERE "orders"."id" = numbered_orders."id";

INSERT INTO "order_sequences" ("year", "last_number", "updated_at")
SELECT
  numbered_orders."order_year",
  MAX(numbered_orders."sequence")::INTEGER,
  CURRENT_TIMESTAMP
FROM numbered_orders
GROUP BY numbered_orders."order_year";

CREATE UNIQUE INDEX "orders_order_number_key"
  ON "orders"("order_number");
