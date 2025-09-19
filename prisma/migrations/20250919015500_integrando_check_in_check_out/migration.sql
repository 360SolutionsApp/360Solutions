-- CreateTable
CREATE TABLE "public"."checkIn" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "userCollabId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "initialStatus" TEXT,
    "attachEvidenceOneUrl" TEXT NOT NULL,
    "attachEvidenceTwoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "checkIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checkOut" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "userCollabId" INTEGER NOT NULL,
    "finalTime" TEXT NOT NULL,
    "initialStatus" TEXT,
    "attachEvidenceOneUrl" TEXT NOT NULL,
    "attachEvidenceTwoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "checkOut_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."checkIn" ADD CONSTRAINT "checkIn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."workOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."checkIn" ADD CONSTRAINT "checkIn_userCollabId_fkey" FOREIGN KEY ("userCollabId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."checkOut" ADD CONSTRAINT "checkOut_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."workOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."checkOut" ADD CONSTRAINT "checkOut_userCollabId_fkey" FOREIGN KEY ("userCollabId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
