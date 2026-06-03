CREATE TYPE "PerceivedDifficulty" AS ENUM ('TOO_EASY', 'ABOUT_RIGHT', 'TOO_HARD');
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "perceivedDifficulty" "PerceivedDifficulty";
