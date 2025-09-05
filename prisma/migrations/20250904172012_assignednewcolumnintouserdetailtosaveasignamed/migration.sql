-- AlterTable
ALTER TABLE "public"."UserDetail" ADD COLUMN     "assignamentId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."UserDetail" ADD CONSTRAINT "UserDetail_assignamentId_fkey" FOREIGN KEY ("assignamentId") REFERENCES "public"."Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
