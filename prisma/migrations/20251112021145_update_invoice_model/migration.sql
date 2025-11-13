/*
  Warnings:

  - You are about to drop the column `appliedSurcharges` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `assignmentId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `hoursWorked` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `orderAssignedId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerHourCollaborator` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerHourCompany` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmountBaseCollab` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmountBaseCompany` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `workOrderCode` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `InvoiceAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerHour` on the `InvoiceAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `InvoiceAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `InvoiceAssignment` table. All the data in the column will be lost.
  - You are about to drop the `InvoiceDetail` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `totalBaseCollab` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalBaseCompany` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalHoursWorked` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalWithSurchargesCollab` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalWithSurchargesCompany` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workOrderId` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerHourCollaborator` to the `InvoiceAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerHourCompany` to the `InvoiceAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmountCollaborator` to the `InvoiceAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmountCompany` to the `InvoiceAssignment` table without a default value. This is not possible if the table is not empty.
  - Made the column `checkIn` on table `InvoiceAssignment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `checkOut` on table `InvoiceAssignment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hoursWorked` on table `InvoiceAssignment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_orderAssignedId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InvoiceDetail" DROP CONSTRAINT "InvoiceDetail_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InvoiceDetail" DROP CONSTRAINT "InvoiceDetail_salarySurchargeId_fkey";

-- AlterTable
ALTER TABLE "public"."Invoice" DROP COLUMN "appliedSurcharges",
DROP COLUMN "assignmentId",
DROP COLUMN "hoursWorked",
DROP COLUMN "orderAssignedId",
DROP COLUMN "pricePerHourCollaborator",
DROP COLUMN "pricePerHourCompany",
DROP COLUMN "totalAmountBaseCollab",
DROP COLUMN "totalAmountBaseCompany",
DROP COLUMN "workOrderCode",
ADD COLUMN     "totalBaseCollab" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalBaseCompany" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalHoursWorked" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalWithSurchargesCollab" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalWithSurchargesCompany" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "workOrderId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."InvoiceAssignment" DROP COLUMN "createdAt",
DROP COLUMN "pricePerHour",
DROP COLUMN "totalAmount",
DROP COLUMN "updatedAt",
ADD COLUMN     "pricePerHourCollaborator" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pricePerHourCompany" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalAmountCollaborator" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalAmountCompany" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "roleName" DROP NOT NULL,
ALTER COLUMN "checkIn" SET NOT NULL,
ALTER COLUMN "checkOut" SET NOT NULL,
ALTER COLUMN "hoursWorked" SET NOT NULL;

-- DropTable
DROP TABLE "public"."InvoiceDetail";

-- CreateTable
CREATE TABLE "public"."InvoiceAssignmentSurcharge" (
    "id" SERIAL NOT NULL,
    "invoiceAssignmentId" INTEGER NOT NULL,
    "surchargeId" INTEGER NOT NULL,
    "hoursApplied" DOUBLE PRECISION NOT NULL,
    "appliedMultiplier" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceAssignmentSurcharge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."workOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceAssignmentSurcharge" ADD CONSTRAINT "InvoiceAssignmentSurcharge_invoiceAssignmentId_fkey" FOREIGN KEY ("invoiceAssignmentId") REFERENCES "public"."InvoiceAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceAssignmentSurcharge" ADD CONSTRAINT "InvoiceAssignmentSurcharge_surchargeId_fkey" FOREIGN KEY ("surchargeId") REFERENCES "public"."SalarySurcharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
