-- AlterTable
ALTER TABLE "public"."breakPeriod" ADD COLUMN     "reason" TEXT,
ALTER COLUMN "userCollabId" DROP NOT NULL,
ALTER COLUMN "checkInId" DROP NOT NULL;
