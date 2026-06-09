-- AlterTable: add showHyroxTab to AthleteProfile
ALTER TABLE "AthleteProfile" ADD COLUMN "showHyroxTab" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: add hyroxStationScores to AthleteModel
ALTER TABLE "AthleteModel" ADD COLUMN "hyroxStationScores" JSONB;

-- CreateTable: HyroxIntelligence
CREATE TABLE "HyroxIntelligence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationAdvice" JSONB NOT NULL,
    "raceDayBrief" TEXT NOT NULL,
    "partnerNotes" TEXT,
    "weaknessInterventions" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HyroxIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HyroxIntelligence_userId_weekStart_key" ON "HyroxIntelligence"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "HyroxIntelligence" ADD CONSTRAINT "HyroxIntelligence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
