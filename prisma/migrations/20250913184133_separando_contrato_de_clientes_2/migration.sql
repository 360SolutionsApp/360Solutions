/*
  Warnings:

  - Added the required column `clientAddress` to the `ClientCompany` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientCityId` to the `ClientCompany` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ClientCompany" ADD COLUMN     "clientAddress" TEXT NOT NULL,
ADD COLUMN     "clientCityId" INTEGER NOT NULL;
