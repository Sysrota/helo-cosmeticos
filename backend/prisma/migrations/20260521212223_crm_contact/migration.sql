/*
  Warnings:

  - You are about to drop the column `avatar_url` on the `contacts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "avatar_url",
ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "blocked_ai" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "last_order_at" TIMESTAMP(3),
ADD COLUMN     "lead_status" TEXT NOT NULL DEFAULT 'novo',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "priority" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "total_spent" DOUBLE PRECISION NOT NULL DEFAULT 0;
