-- Add WHOOP token fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whoopId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whoopAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whoopRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whoopTokenExpiry" TIMESTAMP(3);

-- Unique constraint on whoopId
CREATE UNIQUE INDEX IF NOT EXISTS "User_whoopId_key" ON "User"("whoopId");

-- CreateTable WhoopActivity
CREATE TABLE IF NOT EXISTS "WhoopActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whoopId" TEXT NOT NULL,
    "sportName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "strain" DOUBLE PRECISION NOT NULL,
    "avgHeartRate" DOUBLE PRECISION,
    "maxHeartRate" DOUBLE PRECISION,
    "calories" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhoopActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable WhoopRecovery
CREATE TABLE IF NOT EXISTS "WhoopRecovery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recoveryScore" DOUBLE PRECISION NOT NULL,
    "hrvRmssd" DOUBLE PRECISION,
    "restingHr" DOUBLE PRECISION,
    "sleepScore" DOUBLE PRECISION,
    "sleepDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhoopRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhoopActivity_whoopId_key" ON "WhoopActivity"("whoopId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhoopRecovery_userId_date_key" ON "WhoopRecovery"("userId", "date");

-- AddForeignKey
ALTER TABLE "WhoopActivity" ADD CONSTRAINT "WhoopActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhoopRecovery" ADD CONSTRAINT "WhoopRecovery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
