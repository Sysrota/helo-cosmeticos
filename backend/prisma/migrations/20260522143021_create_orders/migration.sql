/*
  Warnings:

  - You are about to drop the column `price` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `address_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_deadline` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_price` on the `orders` table. All the data in the column will be lost.
  - Added the required column `total` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `order_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_address_id_fkey";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "price",
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "unit_price" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "address_id",
DROP COLUMN "shipping_deadline",
DROP COLUMN "shipping_price",
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "shipping" DOUBLE PRECISION NOT NULL DEFAULT 0;
