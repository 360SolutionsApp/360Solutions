-- AlterTable
ALTER TABLE "public"."ClientPricePerAssignment" ALTER COLUMN "pricePerHour" SET DEFAULT 0,
ALTER COLUMN "pricePerHour" SET DATA TYPE DECIMAL(65,30);
