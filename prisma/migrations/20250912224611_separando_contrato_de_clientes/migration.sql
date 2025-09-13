/*
  Warnings:

  - You are about to drop the column `cityCompany` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `companyAddress` on the `ContractClient` table. All the data in the column will be lost.
  - Added the required column `contractAddress` to the `ContractClient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contractCityId` to the `ContractClient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ClientCompany" DROP COLUMN "cityCompany";

-- AlterTable
ALTER TABLE "public"."ContractClient" DROP COLUMN "companyAddress",
ADD COLUMN     "contractAddress" TEXT NOT NULL,
ADD COLUMN     "contractCityId" INTEGER NOT NULL;
