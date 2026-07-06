CREATE TABLE "order_shipping_events" (
  "id" SERIAL NOT NULL,
  "order_id" INTEGER NOT NULL,
  "event" TEXT NOT NULL,
  "status" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "tracking_code" TEXT,
  "tracking_url" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_shipping_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_shipping_events_order_id_event_occurred_at_key"
  ON "order_shipping_events"("order_id", "event", "occurred_at");

ALTER TABLE "order_shipping_events"
  ADD CONSTRAINT "order_shipping_events_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
