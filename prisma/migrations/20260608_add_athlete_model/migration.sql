CREATE TABLE "AthleteModel" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ctl" DOUBLE PRECISION,
  "atl" DOUBLE PRECISION,
  "tsb" DOUBLE PRECISION,
  "tssHistory" JSONB,
  "rpeAvg7d" DOUBLE PRECISION,
  "rpeAvg28d" DOUBLE PRECISION,
  "complianceRate28d" DOUBLE PRECISION,
  "avgWeeklyMiles" DOUBLE PRECISION,
  "avgRecovery7d" DOUBLE PRECISION,
  "avgHrv7d" DOUBLE PRECISION,
  "avgSleepScore7d" DOUBLE PRECISION,
  "projectedHyroxTime" DOUBLE PRECISION,
  "stationReadiness" DOUBLE PRECISION,
  "weaknesses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "injuryRiskFlag" BOOLEAN NOT NULL DEFAULT false,
  "injuryRiskNote" TEXT,
  "dataConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AthleteModel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AthleteModel_userId_key" ON "AthleteModel"("userId");

ALTER TABLE "AthleteModel" ADD CONSTRAINT "AthleteModel_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
