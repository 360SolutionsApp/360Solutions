-- AlterEnum
ALTER TYPE "public"."WorkOrderStatus" ADD VALUE 'INACTIVE';

-- AlterTable
ALTER TABLE "public"."ClientCompany" ADD COLUMN     "contractStatus" "public"."WorkOrderStatus" DEFAULT 'PENDING';
