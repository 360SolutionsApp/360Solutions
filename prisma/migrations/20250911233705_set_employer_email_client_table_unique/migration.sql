/*
  Warnings:

  - A unique constraint covering the columns `[employerEmail]` on the table `ClientCompany` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ClientCompany_employerEmail_key" ON "public"."ClientCompany"("employerEmail");
