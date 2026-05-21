-- CreateTable
CREATE TABLE "contact_addresses" (
    "id" SERIAL NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "cep" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "address_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_method" TEXT,
    "shipping_deadline" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contact_addresses" ADD CONSTRAINT "contact_addresses_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "contact_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
