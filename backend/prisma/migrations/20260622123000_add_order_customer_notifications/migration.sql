CREATE TABLE "order_customer_notifications" (
  "id" SERIAL NOT NULL,
  "order_id" INTEGER NOT NULL,
  "channel" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_customer_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_customer_notifications_order_id_channel_type_key"
  ON "order_customer_notifications"("order_id", "channel", "type");

ALTER TABLE "order_customer_notifications"
  ADD CONSTRAINT "order_customer_notifications_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
