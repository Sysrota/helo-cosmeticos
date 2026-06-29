CREATE TABLE "coupons" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "partner_name" TEXT NOT NULL,
  "partner_email" TEXT,
  "discount_type" TEXT NOT NULL,
  "discount_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "min_subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "max_discount" DOUBLE PRECISION,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "usage_limit" INTEGER,
  "usage_limit_per_customer" INTEGER,
  "allow_pix_discount" BOOLEAN NOT NULL DEFAULT true,
  "commission_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

ALTER TABLE "orders"
  ADD COLUMN "coupon_id" INTEGER,
  ADD COLUMN "coupon_code" TEXT,
  ADD COLUMN "coupon_discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "payment_discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_coupon_id_fkey"
  FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "coupon_redemptions" (
  "id" SERIAL NOT NULL,
  "coupon_id" INTEGER NOT NULL,
  "order_id" INTEGER NOT NULL,
  "contact_id" INTEGER NOT NULL,
  "code" TEXT NOT NULL,
  "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupon_redemptions_coupon_id_order_id_key"
  ON "coupon_redemptions"("coupon_id", "order_id");

ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey"
  FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
