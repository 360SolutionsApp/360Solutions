-- CreateTable
CREATE TABLE "public"."breakPeriod" (
    "id" SERIAL NOT NULL,
    "userCollabId" INTEGER NOT NULL,
    "checkInId" INTEGER NOT NULL,
    "checkOutId" INTEGER,
    "breakTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "breakPeriod_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."breakPeriod" ADD CONSTRAINT "breakPeriod_userCollabId_fkey" FOREIGN KEY ("userCollabId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."breakPeriod" ADD CONSTRAINT "breakPeriod_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "public"."checkIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."breakPeriod" ADD CONSTRAINT "breakPeriod_checkOutId_fkey" FOREIGN KEY ("checkOutId") REFERENCES "public"."checkOut"("id") ON DELETE CASCADE ON UPDATE CASCADE;
