-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shipping_deadline" TEXT,
ADD COLUMN     "shipping_method" TEXT,
ADD COLUMN     "shipping_price" DOUBLE PRECISION NOT NULL DEFAULT 0;
