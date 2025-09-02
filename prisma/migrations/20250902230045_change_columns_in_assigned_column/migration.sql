/*
  Warnings:

  - You are about to drop the column `discount` on the `Assignment` table. All the data in the column will be lost.
  - Added the required column `assignmentType` to the `Assignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Assignment" DROP COLUMN "discount",
ADD COLUMN     "assignmentType" INTEGER NOT NULL;
