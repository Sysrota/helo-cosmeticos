-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "ai_stage" TEXT,
ADD COLUMN     "ai_summary" TEXT,
ADD COLUMN     "cart_json" JSONB,
ADD COLUMN     "checkout_url" TEXT,
ADD COLUMN     "customer_city" TEXT,
ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "customer_state" TEXT,
ADD COLUMN     "last_product_id" INTEGER;
