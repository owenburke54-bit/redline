-- CreateEnum
CREATE TYPE "AdaptationType" AS ENUM ('LOAD_REDUCTION', 'RECOVERY_WEEK', 'RAMP_CORRECTION', 'INTENSITY_SHIFT', 'LOAD_INCREASE');

-- CreateEnum
CREATE TYPE "AdaptationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "PlanAdaptation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "adaptationType" "AdaptationType" NOT NULL,
    "severity" "AdaptationSeverity" NOT NULL,
    "triggerSignals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "weekRange" JSONB NOT NULL,
    "workoutsModified" INTEGER NOT NULL DEFAULT 0,
    "coachSummary" TEXT NOT NULL,
    "coachMessage" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanAdaptation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanAdaptation_userId_appliedAt_idx" ON "PlanAdaptation"("userId", "appliedAt");

-- CreateIndex
CREATE INDEX "PlanAdaptation_planId_appliedAt_idx" ON "PlanAdaptation"("planId", "appliedAt");

-- AddForeignKey
ALTER TABLE "PlanAdaptation" ADD CONSTRAINT "PlanAdaptation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAdaptation" ADD CONSTRAINT "PlanAdaptation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
