-- CreateTable
CREATE TABLE "public"."orderAcceptByCollab" (
    "id" SERIAL NOT NULL,
    "collaboratorId" INTEGER,
    "workOrderId" INTEGER,
    "acceptWorkOrder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "orderAcceptByCollab_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."orderAcceptByCollab" ADD CONSTRAINT "orderAcceptByCollab_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orderAcceptByCollab" ADD CONSTRAINT "orderAcceptByCollab_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."workOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
