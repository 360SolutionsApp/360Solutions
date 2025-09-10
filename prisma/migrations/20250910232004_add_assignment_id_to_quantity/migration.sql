/*
  Warnings:

  - Added the required column `assignmentId` to the `assignmentQuantityForWorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."assignmentQuantityForWorkOrder" ADD COLUMN     "assignmentId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."assignmentQuantityForWorkOrder" ADD CONSTRAINT "assignmentQuantityForWorkOrder_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
