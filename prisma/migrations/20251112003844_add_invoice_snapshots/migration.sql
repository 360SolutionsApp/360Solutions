-- DropForeignKey
ALTER TABLE "public"."Invoice" DROP CONSTRAINT "Invoice_assignmentId_fkey";

-- AlterTable
ALTER TABLE "public"."Invoice" ALTER COLUMN "assignmentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."InvoiceAssignment" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "assignmentId" INTEGER,
    "assignmentName" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "pricePerHour" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceAssignment" ADD CONSTRAINT "InvoiceAssignment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceAssignment" ADD CONSTRAINT "InvoiceAssignment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
