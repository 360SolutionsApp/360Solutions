-- AlterTable
ALTER TABLE "public"."checkIn" ALTER COLUMN "attachEvidenceOneUrl" DROP NOT NULL,
ALTER COLUMN "attachEvidenceTwoUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."checkOut" ALTER COLUMN "attachEvidenceOneUrl" DROP NOT NULL,
ALTER COLUMN "attachEvidenceTwoUrl" DROP NOT NULL;
