/*
  Warnings:

  - You are about to drop the column `coustPerHour` on the `UserDetail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."UserDetail" DROP COLUMN "coustPerHour";

-- CreateTable
CREATE TABLE "public"."userCostPerAssignment" (
    "id" SERIAL NOT NULL,
    "userDetailId" INTEGER NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "costPerHour" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userCostPerAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."userCostPerAssignment" ADD CONSTRAINT "userCostPerAssignment_userDetailId_fkey" FOREIGN KEY ("userDetailId") REFERENCES "public"."UserDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userCostPerAssignment" ADD CONSTRAINT "userCostPerAssignment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
