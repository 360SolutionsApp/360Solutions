/*
  Warnings:

  - The `contractStatus` column on the `ContractClient` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `workOrderStatus` on the `workOrder` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."itemStatus" AS ENUM ('PENDING', 'PARTIALLY_RUNNING', 'RUNNING', 'PARTIALLY_CLOSED', 'CLOSED', 'CANCELED', 'INACTIVE', 'DELETE');

-- AlterTable
ALTER TABLE "public"."ContractClient" DROP COLUMN "contractStatus",
ADD COLUMN     "contractStatus" "public"."itemStatus" DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."orderAssignToCollabs" ADD COLUMN     "itemStatus" "public"."itemStatus";

-- AlterTable
ALTER TABLE "public"."workOrder" DROP COLUMN "workOrderStatus",
ADD COLUMN     "itemStatus" "public"."itemStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "public"."WorkOrderStatus";
