-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_status" TEXT DEFAULT 'pending',
ADD COLUMN     "pix_code" TEXT,
ADD COLUMN     "pix_qrcode" TEXT;
