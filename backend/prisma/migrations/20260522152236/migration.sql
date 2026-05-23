/*
  Warnings:

  - The `payment_methods` column on the `store_config` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "store_config" ADD COLUMN     "ai_rules" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shipping_methods" JSONB,
DROP COLUMN "payment_methods",
ADD COLUMN     "payment_methods" JSONB;
