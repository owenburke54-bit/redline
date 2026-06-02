import { db } from "@/lib/db";
import { fetchStravaActivities } from "./client";

const RUN_ACTIVITY_TYPES = new Set(["Run", "VirtualRun", "TrailRun"]);
const STRENGTH_ACTIVITY_TYPES = new Set(["WeightTraining", "Workout", "CrossFit"]);

const RUN_WORKOUT_TYPES = ["EASY_RUN", "LONG_RUN", "TEMPO", "INTERVALS", "RACE"];
const STRENGTH_WORKOUT_TYPES = ["STRENGTH", "CROSS_TRAIN"];

async function matchActivityToWorkout(
  userId: string,
  stravaId: string,
  type: string,
  startDate: Date,
  distanceMeters: number,
  movingTimeSec: number
): Promise<void> {
  let workoutTypes: string[];
  if (RUN_ACTIVITY_TYPES.has(type)) {
    workoutTypes = RUN_WORKOUT_TYPES;
  } else if (STRENGTH_ACTIVITY_TYPES.has(type)) {
    workoutTypes = STRENGTH_WORKOUT_TYPES;
  } else {
    return;
  }

  const dayStart = new Date(startDate);
  dayStart.setHours(0, 0, 0, 0);

  // Search ±1 day to handle late logging or timezone drift
  const windowStart = new Date(dayStart.getTime() - 86400000);
  const windowEnd = new Date(dayStart.getTime() + 2 * 86400000);

  const candidates = await db.workout.findMany({
    where: {
      userId,
      type: { in: workoutTypes as ("EASY_RUN" | "LONG_RUN" | "TEMPO" | "INTERVALS" | "RACE" | "STRENGTH" | "CROSS_TRAIN")[] },
      scheduledDate: { gte: windowStart, lt: windowEnd },
      status: { notIn: ["COMPLETED", "SKIPPED"] },
      stravaActivityId: null,
    },
    orderBy: { scheduledDate: "asc" },
  });

  if (candidates.length === 0) return;

  const distanceMi = distanceMeters / 1609.34;

  // Prefer exact-day match, then fall back to adjacent days
  const sameDay = candidates.filter(w => {
    const d = new Date(w.scheduledDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === dayStart.getTime();
  });

  const pool = sameDay.length > 0 ? sameDay : candidates;

  // Among the pool, pick the workout with the closest target distance
  const best = pool.reduce((prev, curr) => {
    const prevDiff = Math.abs((prev.targetDistance ?? distanceMi) - distanceMi);
    const currDiff = Math.abs((curr.targetDistance ?? distanceMi) - distanceMi);
    return currDiff < prevDiff ? curr : prev;
  });

  await db.workout.update({
    where: { id: best.id },
    data: {
      status: "COMPLETED",
      completedAt: startDate,
      actualDistance: parseFloat(distanceMi.toFixed(2)),
      actualDuration: Math.round(movingTimeSec / 60),
      stravaActivityId: stravaId,
    },
  });

  await db.stravaActivity.update({
    where: { stravaId },
    data: { matchedWorkoutId: best.id },
  });
}

export async function syncStravaActivities(userId: string, daysBack = 90): Promise<number> {
  const since = new Date(Date.now() - daysBack * 86_400_000);
  const activities = await fetchStravaActivities(userId, since);

  let upserted = 0;
  for (const a of activities) {
    const stravaId = String(a.id);

    const record = await db.stravaActivity.upsert({
      where: { stravaId },
      create: {
        userId,
        stravaId,
        type: a.type,
        name: a.name,
        distance: a.distance,
        movingTime: a.moving_time,
        elapsedTime: a.elapsed_time,
        startDate: new Date(a.start_date),
        averageHeartrate: a.average_heartrate ?? null,
        maxHeartrate: a.max_heartrate ?? null,
        averageSpeed: a.average_speed ?? null,
        effortScore: a.suffer_score ?? null,
      },
      update: {
        name: a.name,
        averageHeartrate: a.average_heartrate ?? null,
        maxHeartrate: a.max_heartrate ?? null,
        averageSpeed: a.average_speed ?? null,
        effortScore: a.suffer_score ?? null,
      },
      select: { matchedWorkoutId: true },
    });

    // Auto-match only if not already linked to a workout
    if (!record.matchedWorkoutId) {
      await matchActivityToWorkout(
        userId,
        stravaId,
        a.type,
        new Date(a.start_date),
        a.distance,
        a.moving_time
      );
    }

    upserted++;
  }

  return upserted;
}
