-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "client_ip_address" TEXT,
ADD COLUMN     "client_user_agent" TEXT,
ADD COLUMN     "fbc" TEXT,
ADD COLUMN     "fbp" TEXT,
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'online';
