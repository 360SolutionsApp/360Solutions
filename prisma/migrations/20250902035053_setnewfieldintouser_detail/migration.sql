/*
  Warnings:

  - You are about to drop the column `attachedCertificateUrl` on the `UserDetail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."UserDetail" DROP COLUMN "attachedCertificateUrl",
ADD COLUMN     "applicationCvUrl" TEXT,
ADD COLUMN     "socialSecurityUrl" TEXT;
