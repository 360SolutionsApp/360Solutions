-- AlterTable
ALTER TABLE "public"."InvoiceAssignment" ADD COLUMN     "totalRegularCollaborator" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalRegularCompany" DOUBLE PRECISION NOT NULL DEFAULT 0;
