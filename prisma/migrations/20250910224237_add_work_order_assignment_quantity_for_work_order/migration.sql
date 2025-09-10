-- CreateTable
CREATE TABLE "public"."workOrder" (
    "id" SERIAL NOT NULL,
    "companyClientId" INTEGER NOT NULL,
    "userEmailRegistry" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "workOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignmentQuantityForWorkOrder" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "quantityWorkers" INTEGER NOT NULL,

    CONSTRAINT "assignmentQuantityForWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_assigmentWorkOrder" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_assigmentWorkOrder_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_assigmentWorkOrder_B_index" ON "public"."_assigmentWorkOrder"("B");

-- AddForeignKey
ALTER TABLE "public"."workOrder" ADD CONSTRAINT "workOrder_companyClientId_fkey" FOREIGN KEY ("companyClientId") REFERENCES "public"."ClientCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignmentQuantityForWorkOrder" ADD CONSTRAINT "assignmentQuantityForWorkOrder_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."workOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_assigmentWorkOrder" ADD CONSTRAINT "_assigmentWorkOrder_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_assigmentWorkOrder" ADD CONSTRAINT "_assigmentWorkOrder_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."workOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
