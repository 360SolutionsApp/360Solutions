-- AlterTable
ALTER TABLE "public"."workOrder" ADD COLUMN     "clientId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."workOrder" ADD CONSTRAINT "workOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ClientCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
