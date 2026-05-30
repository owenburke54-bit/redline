import { db } from "@/lib/db";
import { fetchWorkouts, fetchRecoveries, fetchSleepSessions, fetchCycles, fetchWorkoutById, fetchRecoveryById, sportName } from "./client";

export async function syncWhoopData(userId: string, daysBack = 30): Promise<{ activities: number; recoveries: number }> {
  const end = new Date();
  const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const [workouts, recoveries, sleepSessions, cycles] = await Promise.all([
    fetchWorkouts(userId, start, end),
    fetchRecoveries(userId, start, end),
    fetchSleepSessions(userId, start, end),
    fetchCycles(userId, start, end),
  ]);

  // Index sleep sessions by cycle_id for O(1) lookup when combining with recovery
  const sleepByCycleId = new Map(
    sleepSessions.map(s => [s.cycle_id, s])
  );

  let activitiesUpserted = 0;
  let recoveriesUpserted = 0;

  for (const w of workouts) {
    if (!w.score) continue;
    await db.whoopActivity.upsert({
      where: { whoopId: String(w.id) },
      create: {
        userId,
        whoopId: String(w.id),
        sportName: sportName(w.sport_id),
        startDate: new Date(w.start),
        endDate: new Date(w.end),
        strain: w.score.strain,
        avgHeartRate: w.score.average_heart_rate ?? null,
        maxHeartRate: w.score.max_heart_rate ?? null,
        calories: w.score.kilojoule ? w.score.kilojoule / 4.184 : null,
      },
      update: {
        strain: w.score.strain,
        avgHeartRate: w.score.average_heart_rate ?? null,
        maxHeartRate: w.score.max_heart_rate ?? null,
      },
    });
    activitiesUpserted++;
  }

  for (const r of recoveries) {
    if (!r.score || r.score_state !== "SCORED") continue;
    const date = new Date(r.created_at);
    date.setHours(0, 0, 0, 0);

    // Pull sleep score + duration from matching sleep session (v2: separate endpoint, linked by cycle_id)
    const sleep = sleepByCycleId.get(r.cycle_id);
    const sleepScore = sleep?.score?.sleep_performance_percentage ?? null;
    const sleepDuration = sleep?.score?.stage_summary?.total_in_bed_duration_milli
      ? Math.round(sleep.score.stage_summary.total_in_bed_duration_milli / 60000)
      : null;

    await db.whoopRecovery.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        recoveryScore: r.score.recovery_score,
        hrvRmssd: r.score.hrv_rmssd_milli ?? null,
        restingHr: r.score.resting_heart_rate ?? null,
        sleepScore,
        sleepDuration,
      },
      update: {
        recoveryScore: r.score.recovery_score,
        hrvRmssd: r.score.hrv_rmssd_milli ?? null,
        restingHr: r.score.resting_heart_rate ?? null,
        sleepScore,
        sleepDuration,
      },
    });
    recoveriesUpserted++;
  }

  // Sync daily cycles (primary WHOOP strain source for users without explicit workout tracking)
  for (const c of cycles) {
    if (!c.score || c.score_state !== "SCORED") continue;
    await db.whoopActivity.upsert({
      where: { whoopId: `cycle_${c.id}` },
      create: {
        userId,
        whoopId: `cycle_${c.id}`,
        sportName: "Cycle",
        startDate: new Date(c.start),
        endDate: c.end ? new Date(c.end) : new Date(),
        strain: c.score.strain,
        avgHeartRate: c.score.average_heart_rate,
        maxHeartRate: c.score.max_heart_rate,
        calories: c.score.kilojoule / 4.184,
      },
      update: {
        strain: c.score.strain,
        avgHeartRate: c.score.average_heart_rate,
        maxHeartRate: c.score.max_heart_rate,
        endDate: c.end ? new Date(c.end) : new Date(),
      },
    });
    activitiesUpserted++;
  }

  return { activities: activitiesUpserted, recoveries: recoveriesUpserted };
}

export async function syncWorkoutById(userId: string, workoutId: number): Promise<void> {
  const w = await fetchWorkoutById(userId, workoutId);
  if (!w.score) return;

  await db.whoopActivity.upsert({
    where: { whoopId: String(w.id) },
    create: {
      userId,
      whoopId: String(w.id),
      sportName: sportName(w.sport_id),
      startDate: new Date(w.start),
      endDate: new Date(w.end),
      strain: w.score.strain,
      avgHeartRate: w.score.average_heart_rate ?? null,
      maxHeartRate: w.score.max_heart_rate ?? null,
      calories: w.score.kilojoule ? w.score.kilojoule / 4.184 : null,
    },
    update: {
      strain: w.score.strain,
      avgHeartRate: w.score.average_heart_rate ?? null,
      maxHeartRate: w.score.max_heart_rate ?? null,
    },
  });
}

export async function syncRecoveryById(userId: string, cycleId: number): Promise<void> {
  const r = await fetchRecoveryById(userId, cycleId);
  if (!r.score || r.score_state !== "SCORED") return;

  const date = new Date(r.created_at);
  date.setHours(0, 0, 0, 0);

  await db.whoopRecovery.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      recoveryScore: r.score.recovery_score,
      hrvRmssd: r.score.hrv_rmssd_milli ?? null,
      restingHr: r.score.resting_heart_rate ?? null,
      sleepScore: null,
      sleepDuration: null,
    },
    update: {
      recoveryScore: r.score.recovery_score,
      hrvRmssd: r.score.hrv_rmssd_milli ?? null,
      restingHr: r.score.resting_heart_rate ?? null,
    },
  });
}

export function formatWhoopContextForCoach(
  activities: { sportName: string; startDate: Date; strain: number }[],
  todayRecovery: { recoveryScore: number; hrvRmssd: number | null; restingHr: number | null; sleepScore: number | null; sleepDuration: number | null } | null
): string {
  const lines: string[] = [];

  if (todayRecovery) {
    const level = todayRecovery.recoveryScore >= 67 ? "green — ready to perform"
      : todayRecovery.recoveryScore >= 34 ? "yellow — moderate readiness"
      : "red — prioritize recovery";

    lines.push(`Recovery today: ${Math.round(todayRecovery.recoveryScore)}% (${level})`);
    if (todayRecovery.hrvRmssd) lines.push(`HRV: ${Math.round(todayRecovery.hrvRmssd)}ms | RHR: ${todayRecovery.restingHr ? Math.round(todayRecovery.restingHr) : "?"}bpm`);
    if (todayRecovery.sleepScore && todayRecovery.sleepDuration) {
      const hours = (todayRecovery.sleepDuration / 60).toFixed(1);
      lines.push(`Sleep: ${hours}h, score ${Math.round(todayRecovery.sleepScore)}%`);
    }
  }

  const nonRunActivities = activities.filter(
    a => !["Running", "Cycling"].includes(a.sportName)
  );

  if (nonRunActivities.length > 0) {
    const formatted = nonRunActivities.map(a => {
      const day = a.startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      return `${a.sportName} (${day}, strain ${a.strain.toFixed(1)})`;
    }).join(", ");
    lines.push(`Other training: ${formatted}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No WHOOP data available";
}
