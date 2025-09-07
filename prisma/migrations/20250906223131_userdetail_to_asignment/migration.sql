/*
  Warnings:

  - You are about to drop the column `assignamentId` on the `UserDetail` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."UserDetail" DROP CONSTRAINT "UserDetail_assignamentId_fkey";

-- AlterTable
ALTER TABLE "public"."UserDetail" DROP COLUMN "assignamentId",
ADD COLUMN     "coustPerHour" INTEGER;

-- CreateTable
CREATE TABLE "public"."_UserDetailAssignments" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserDetailAssignments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserDetailAssignments_B_index" ON "public"."_UserDetailAssignments"("B");

-- AddForeignKey
ALTER TABLE "public"."_UserDetailAssignments" ADD CONSTRAINT "_UserDetailAssignments_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_UserDetailAssignments" ADD CONSTRAINT "_UserDetailAssignments_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."UserDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
