CREATE TABLE "order_status_emails" (
  "id" SERIAL NOT NULL,
  "order_id" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_status_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_status_emails_order_id_status_key"
  ON "order_status_emails"("order_id", "status");

ALTER TABLE "order_status_emails"
  ADD CONSTRAINT "order_status_emails_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
