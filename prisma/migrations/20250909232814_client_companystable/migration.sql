-- CreateTable
CREATE TABLE "public"."ClientCompany" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "employerIdentificationNumber" TEXT NOT NULL,
    "employerEmail" TEXT NOT NULL,
    "employerPhone" TEXT NOT NULL,
    "representativeName" TEXT NOT NULL,
    "cityCompany" INTEGER NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "attachedContractUrl" TEXT NOT NULL,
    "contractCodePo" TEXT NOT NULL,
    "totalContractValue" INTEGER NOT NULL,
    "administrativeDiscounts" INTEGER NOT NULL,
    "DateStartWork" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IdUserRegistering" INTEGER NOT NULL,

    CONSTRAINT "ClientCompany_pkey" PRIMARY KEY ("id")
);
