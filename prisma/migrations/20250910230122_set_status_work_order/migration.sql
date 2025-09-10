-- CreateEnum
CREATE TYPE "public"."WorkOrderStatus" AS ENUM ('PENDING', 'RUNNING', 'CLOSED', 'CANCELED');

-- AlterTable
ALTER TABLE "public"."workOrder" ADD COLUMN     "workOrderStatus" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING';
