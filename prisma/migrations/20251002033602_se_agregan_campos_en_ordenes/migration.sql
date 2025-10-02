-- AlterTable
ALTER TABLE "public"."orderAssignToCollabs" ALTER COLUMN "orderWorkDateStart" DROP NOT NULL,
ALTER COLUMN "orderWorkDateEnd" DROP NOT NULL,
ALTER COLUMN "orderWorkHourStart" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."workOrder" ADD COLUMN     "orderWorkHourStart" TEXT,
ADD COLUMN     "workOrderEndDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "workOrderStartDate" SET DEFAULT CURRENT_TIMESTAMP;
