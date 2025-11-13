/*
  Warnings:

  - You are about to drop the column `checkOutId` on the `breakPeriod` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."breakPeriod" DROP CONSTRAINT "breakPeriod_checkOutId_fkey";

-- AlterTable
ALTER TABLE "public"."breakPeriod" DROP COLUMN "checkOutId";
