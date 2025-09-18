/*
  Warnings:

  - Added the required column `supervisorUserId` to the `workOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."workOrder" ADD COLUMN     "supervisorUserId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."workOrder" ADD CONSTRAINT "workOrder_supervisorUserId_fkey" FOREIGN KEY ("supervisorUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
