-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MARATHON', 'HALF_MARATHON', 'HYROX', 'HYROX_DOUBLES', 'FIVE_K', 'TEN_K');

-- CreateEnum
CREATE TYPE "PlanTemplate" AS ENUM ('HAL_HIGDON_NOVICE', 'HAL_HIGDON_INTERMEDIATE', 'HAL_HIGDON_ADVANCED', 'HYROX_8WK', 'HYROX_16WK');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('EASY_RUN', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'HYROX_STATION_WORK', 'HYROX_SIM', 'STRENGTH', 'CROSS_TRAIN', 'REST', 'RACE');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'SKIPPED', 'MODIFIED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "stravaId" TEXT,
    "stravaAccessToken" TEXT,
    "stravaRefreshToken" TEXT,
    "stravaTokenExpiry" TIMESTAMP(3),
    "dedicationScore" INTEGER NOT NULL DEFAULT 7,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yearsRunning" INTEGER,
    "weeklyMileageBaseline" INTEGER,
    "injuryHistory" TEXT,
    "goalStatement" TEXT,
    "painToleranceRating" INTEGER,
    "inferredDedicationScore" DOUBLE PRECISION,
    "avgWeeklyEffort" DOUBLE PRECISION,
    "consistencyScore" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "goalTime" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "templateBase" "PlanTemplate" NOT NULL,
    "weeklyStructure" JSONB NOT NULL,
    "aiOverrides" JSONB,
    "currentWeek" INTEGER NOT NULL DEFAULT 1,
    "totalWeeks" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastAiReview" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "type" "WorkoutType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetDistance" DOUBLE PRECISION,
    "targetDuration" INTEGER,
    "targetPace" TEXT,
    "intensityZone" INTEGER,
    "stations" JSONB,
    "isHyroxSim" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'SCHEDULED',
    "stravaActivityId" TEXT,
    "completedAt" TIMESTAMP(3),
    "actualDistance" DOUBLE PRECISION,
    "actualDuration" INTEGER,
    "perceivedEffort" INTEGER,
    "aiModified" BOOLEAN NOT NULL DEFAULT false,
    "aiModifyReason" TEXT,
    "conflictFlag" BOOLEAN NOT NULL DEFAULT false,
    "conflictNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "averageHeartrate" DOUBLE PRECISION,
    "maxHeartrate" DOUBLE PRECISION,
    "averageSpeed" DOUBLE PRECISION,
    "effortScore" DOUBLE PRECISION,
    "matchedWorkoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StravaActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "perceivedEffort" INTEGER NOT NULL,
    "bodyFeel" INTEGER NOT NULL,
    "completedCount" INTEGER NOT NULL,
    "plannedCount" INTEGER NOT NULL,
    "notes" TEXT,
    "aiResponse" TEXT,
    "planAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "conflictType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedPlanIds" TEXT[],
    "aiSuggestion" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,

    CONSTRAINT "ConflictLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaId_key" ON "User"("stravaId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_userId_key" ON "AthleteProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingPlan_eventId_key" ON "TrainingPlan"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaActivity_stravaId_key" ON "StravaActivity"("stravaId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaActivity" ADD CONSTRAINT "StravaActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyCheckin" ADD CONSTRAINT "WeeklyCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
