/*
  Warnings:

  - You are about to drop the column `DateStartWork` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `administrativeDiscounts` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `attachedContractUrl` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `companyAddress` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `contractCodePo` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `contractStatus` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `totalContractValue` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `companyClientId` on the `workOrder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."workOrder" DROP CONSTRAINT "workOrder_companyClientId_fkey";

-- AlterTable
ALTER TABLE "public"."ClientCompany" DROP COLUMN "DateStartWork",
DROP COLUMN "administrativeDiscounts",
DROP COLUMN "attachedContractUrl",
DROP COLUMN "companyAddress",
DROP COLUMN "contractCodePo",
DROP COLUMN "contractStatus",
DROP COLUMN "totalContractValue";

-- AlterTable
ALTER TABLE "public"."workOrder" DROP COLUMN "companyClientId",
ADD COLUMN     "contractClientId" INTEGER;

-- CreateTable
CREATE TABLE "public"."ContractClient" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "attachedContractUrl" TEXT NOT NULL,
    "contractCodePo" TEXT NOT NULL,
    "totalContractValue" INTEGER NOT NULL,
    "contractStatus" "public"."WorkOrderStatus" DEFAULT 'PENDING',
    "administrativeDiscounts" INTEGER NOT NULL,
    "DateStartWork" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IdUserRegistering" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ContractClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractClient_clientId_key" ON "public"."ContractClient"("clientId");

-- AddForeignKey
ALTER TABLE "public"."ContractClient" ADD CONSTRAINT "ContractClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ClientCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workOrder" ADD CONSTRAINT "workOrder_contractClientId_fkey" FOREIGN KEY ("contractClientId") REFERENCES "public"."ContractClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
