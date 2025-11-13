/*
  Warnings:

  - You are about to drop the column `amountCollaborator` on the `InvoiceDetail` table. All the data in the column will be lost.
  - You are about to drop the column `amountCompany` on the `InvoiceDetail` table. All the data in the column will be lost.
  - You are about to drop the column `percentageApplied` on the `InvoiceDetail` table. All the data in the column will be lost.
  - The `hoursApplied` column on the `InvoiceDetail` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `clientName` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `collaboratorDocumentNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `collaboratorName` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employerIdentificationNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workOrderCode` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workOrderCodePo` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Invoice" ADD COLUMN     "appliedSurcharges" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "clientName" TEXT NOT NULL,
ADD COLUMN     "collaboratorDocumentNumber" TEXT NOT NULL,
ADD COLUMN     "collaboratorName" TEXT NOT NULL,
ADD COLUMN     "employerIdentificationNumber" TEXT NOT NULL,
ADD COLUMN     "workOrderCode" TEXT NOT NULL,
ADD COLUMN     "workOrderCodePo" TEXT NOT NULL,
ALTER COLUMN "hoursWorked" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "pricePerHourCollaborator" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "pricePerHourCompany" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalAmountBaseCollab" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "totalAmountBaseCompany" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."InvoiceDetail" DROP COLUMN "amountCollaborator",
DROP COLUMN "amountCompany",
DROP COLUMN "percentageApplied",
DROP COLUMN "hoursApplied",
ADD COLUMN     "hoursApplied" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
