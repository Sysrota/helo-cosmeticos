-- AlterTable
ALTER TABLE "order_sequences" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "manda_bem_envio_id" TEXT,
ADD COLUMN     "manda_bem_service" TEXT,
ADD COLUMN     "shipping_carrier" TEXT;
