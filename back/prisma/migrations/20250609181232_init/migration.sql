-- CreateTable
CREATE TABLE "Detection" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objects" TEXT[],

    CONSTRAINT "Detection_pkey" PRIMARY KEY ("id")
);
