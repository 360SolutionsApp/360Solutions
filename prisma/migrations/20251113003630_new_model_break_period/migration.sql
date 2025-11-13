/*
  Warnings:

  - You are about to drop the column `breakTime` on the `breakPeriod` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."breakPeriod" DROP COLUMN "breakTime",
ADD COLUMN     "breakEndTime" TEXT,
ADD COLUMN     "breakStartTime" TEXT;
