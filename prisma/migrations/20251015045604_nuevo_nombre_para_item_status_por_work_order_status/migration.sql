/*
  Warnings:

  - The `contractStatus` column on the `ContractClient` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `itemStatus` on the `orderAssignToCollabs` table. All the data in the column will be lost.
  - You are about to drop the column `itemStatus` on the `workOrder` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."WorkOrderStatus" AS ENUM ('PENDING', 'PARTIALLY_RUNNING', 'RUNNING', 'PARTIALLY_CLOSED', 'CLOSED', 'CANCELED', 'INACTIVE', 'DELETE');

-- AlterTable
ALTER TABLE "public"."ContractClient" DROP COLUMN "contractStatus",
ADD COLUMN     "contractStatus" "public"."WorkOrderStatus" DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."orderAssignToCollabs" DROP COLUMN "itemStatus",
ADD COLUMN     "workOrderStatus" "public"."WorkOrderStatus";

-- AlterTable
ALTER TABLE "public"."workOrder" DROP COLUMN "itemStatus",
ADD COLUMN     "workOrderStatus" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "public"."itemStatus";
