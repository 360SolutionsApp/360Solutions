-- AlterTable
ALTER TABLE "public"."orderAssignToCollabs" ALTER COLUMN "workOrderStatus" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."workOrder" ALTER COLUMN "workOrderStatus" DROP NOT NULL;
