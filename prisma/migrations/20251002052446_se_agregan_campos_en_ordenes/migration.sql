/*
  Warnings:

  - You are about to drop the `_UserDetailAssignments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_UserDetailAssignments" DROP CONSTRAINT "_UserDetailAssignments_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_UserDetailAssignments" DROP CONSTRAINT "_UserDetailAssignments_B_fkey";

-- DropTable
DROP TABLE "public"."_UserDetailAssignments";
