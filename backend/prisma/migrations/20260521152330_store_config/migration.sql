-- CreateTable
CREATE TABLE "store_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "payment_methods" TEXT NOT NULL DEFAULT '',
    "shipping_info" TEXT NOT NULL DEFAULT '',
    "business_hours" TEXT NOT NULL DEFAULT '',
    "exchange_policy" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_config_pkey" PRIMARY KEY ("id")
);
