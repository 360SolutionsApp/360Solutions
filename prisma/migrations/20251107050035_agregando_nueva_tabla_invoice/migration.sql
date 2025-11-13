/*
  Warnings:

  - You are about to drop the column `pricePerHour` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Invoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pricePerHourCollaborator` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerHourCompany` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmountBaseCollab` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmountBaseCompany` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Invoice" DROP COLUMN "pricePerHour",
DROP COLUMN "totalAmount",
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "pricePerHourCollaborator" INTEGER NOT NULL,
ADD COLUMN     "pricePerHourCompany" INTEGER NOT NULL,
ADD COLUMN     "totalAmountBaseCollab" INTEGER NOT NULL,
ADD COLUMN     "totalAmountBaseCompany" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."InvoiceDetail" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "salarySurchargeId" INTEGER NOT NULL,
    "hoursApplied" INTEGER NOT NULL,
    "percentageApplied" DOUBLE PRECISION NOT NULL,
    "amountCompany" INTEGER NOT NULL,
    "amountCollaborator" INTEGER NOT NULL,

    CONSTRAINT "InvoiceDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalarySurcharge" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "minHour" INTEGER NOT NULL,
    "maxHour" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalarySurcharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "public"."Invoice"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "public"."InvoiceDetail" ADD CONSTRAINT "InvoiceDetail_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceDetail" ADD CONSTRAINT "InvoiceDetail_salarySurchargeId_fkey" FOREIGN KEY ("salarySurchargeId") REFERENCES "public"."SalarySurcharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
