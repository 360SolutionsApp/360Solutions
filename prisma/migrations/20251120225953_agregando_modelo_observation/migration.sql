-- CreateTable
CREATE TABLE "public"."collabObservations" (
    "id" SERIAL NOT NULL,
    "userCollabId" INTEGER,
    "orderId" INTEGER,
    "clientId" INTEGER,
    "observation" TEXT,
    "rating" DECIMAL(65,30) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "collabObservations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."collabObservations" ADD CONSTRAINT "collabObservations_userCollabId_fkey" FOREIGN KEY ("userCollabId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collabObservations" ADD CONSTRAINT "collabObservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."workOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."collabObservations" ADD CONSTRAINT "collabObservations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."ClientCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
