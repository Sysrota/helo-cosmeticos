ALTER TABLE "orders"
  ADD COLUMN "melhor_envio_order_id" TEXT,
  ADD COLUMN "melhor_envio_protocol" TEXT,
  ADD COLUMN "tracking_code" TEXT,
  ADD COLUMN "tracking_url" TEXT,
  ADD COLUMN "shipping_status" TEXT,
  ADD COLUMN "shipping_status_updated_at" TIMESTAMP(3),
  ADD COLUMN "shipping_events" JSONB;
