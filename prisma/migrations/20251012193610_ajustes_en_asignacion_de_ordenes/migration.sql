-- AlterTable
ALTER TABLE "public"."workersAssignToOrder" ADD COLUMN     "assignmentId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."workersAssignToOrder" ADD CONSTRAINT "workersAssignToOrder_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
