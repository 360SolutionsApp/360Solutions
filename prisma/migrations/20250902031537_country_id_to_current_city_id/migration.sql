/*
  Warnings:

  - You are about to drop the column `originCountry` on the `UserDetail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."UserDetail" DROP COLUMN "originCountry",
ADD COLUMN     "currentCityId" INTEGER;
