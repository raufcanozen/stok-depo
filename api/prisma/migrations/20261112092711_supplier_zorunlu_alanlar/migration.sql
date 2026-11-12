/*
  Warnings:

  - Made the column `email` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `suppliers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tax_number` on table `suppliers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "suppliers" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "tax_number" SET NOT NULL;
