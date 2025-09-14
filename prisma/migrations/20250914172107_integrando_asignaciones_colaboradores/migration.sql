-- CreateTable
CREATE TABLE "public"."orderAssignToCollabs" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "orderWorkDateStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderWorkDateEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderWorkHourStart" TEXT NOT NULL,
    "orderLocationWork" TEXT NOT NULL,
    "orderObservations" TEXT NOT NULL,

    CONSTRAINT "orderAssignToCollabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."workersAssignToOrder" (
    "id" SERIAL NOT NULL,
    "orderAssignToCollabId" INTEGER NOT NULL,
    "collaboratorId" INTEGER NOT NULL,

    CONSTRAINT "workersAssignToOrder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."orderAssignToCollabs" ADD CONSTRAINT "orderAssignToCollabs_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."workOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workersAssignToOrder" ADD CONSTRAINT "workersAssignToOrder_orderAssignToCollabId_fkey" FOREIGN KEY ("orderAssignToCollabId") REFERENCES "public"."orderAssignToCollabs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workersAssignToOrder" ADD CONSTRAINT "workersAssignToOrder_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
