import { db } from "@/lib/db";
import { computeTrainingZones } from "@/lib/strava/zones";
import { computeStationReadiness } from "@/lib/hyrox/computeHyroxReadiness";

interface TssEntry {
  date: string; // YYYY-MM-DD
  tss: number;
}

interface FitnessResult {
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  tssHistory: TssEntry[];
  thresholdSecsPerMile: number | null;
  avgWeeklyMiles: number | null;
}

interface BehavioralResult {
  rpeAvg7d: number | null;
  rpeAvg28d: number | null;
  complianceRate28d: number | null;
}

interface RecoveryResult {
  avgRecovery7d: number | null;
  avgHrv7d: number | null;
  avgSleepScore7d: number | null;
}

interface HyroxResult {
  projectedHyroxTime: number | null;
  stationReadiness: number | null;
  hyroxStationScores: Record<string, number> | null;
}

// rTSS = duration_hours × (threshold_pace / actual_pace)² × 100
// TODO: No grade correction — elevation is not stored in StravaActivity.
// Add totalElevationGain to StravaActivity to enable NGP-based rTSS for hilly courses.
function computeRtss(
  movingTimeSecs: number,
  distanceMeters: number,
  thresholdSecsPerMile: number,
): number {
  if (distanceMeters < 100 || movingTimeSecs < 60) return 0;
  const distanceMiles = distanceMeters / 1609.34;
  const actualSecsPerMile = movingTimeSecs / distanceMiles;
  const durationHours = movingTimeSecs / 3600;
  const intensityFactor = thresholdSecsPerMile / actualSecsPerMile;
  return durationHours * intensityFactor * intensityFactor * 100;
}

// Banister impulse-response EWMA: α = 2 / (period + 1)
function computeEwma(tssHistory: TssEntry[], days: number): number {
  if (tssHistory.length === 0) return 0;
  const alpha = 2 / (days + 1);
  const sorted = [...tssHistory].sort((a, b) => a.date.localeCompare(b.date));
  const tssMap = new Map(sorted.map((e) => [e.date, e.tss]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(sorted[0].date + "T00:00:00");

  let ewma = 0;
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    const tss = tssMap.get(key) ?? 0;
    ewma = (1 - alpha) * ewma + alpha * tss;
    cursor.setDate(cursor.getDate() + 1);
  }
  return ewma;
}

async function computeFitnessMetrics(userId: string): Promise<FitnessResult> {
  try {
    const [stravaRuns, whoopRunning] = await Promise.all([
      db.stravaActivity.findMany({
        where: { userId, type: { in: ["Run", "VirtualRun", "TrailRun"] } },
        select: {
          distance: true,
          movingTime: true,
          averageSpeed: true,
          averageHeartrate: true,
          maxHeartrate: true,
          startDate: true,
        },
        orderBy: { startDate: "asc" },
      }),
      db.whoopActivity.findMany({
        where: { userId, sportName: "Running" },
        select: { startDate: true, avgHeartRate: true, maxHeartRate: true },
      }),
    ]);

    const zones = computeTrainingZones(stravaRuns, whoopRunning);
    const thresholdSecsPerMile = zones.thresholdSecsPerMile;
    const avgWeeklyMiles = zones.avgWeeklyMiles > 0 ? zones.avgWeeklyMiles : null;

    if (!thresholdSecsPerMile || stravaRuns.length === 0) {
      return {
        ctl: null,
        atl: null,
        tsb: null,
        tssHistory: [],
        thresholdSecsPerMile,
        avgWeeklyMiles,
      };
    }

    // Aggregate TSS by day (multiple runs same day sum)
    const dayMap = new Map<string, number>();
    for (const run of stravaRuns) {
      if (!run.averageSpeed || run.averageSpeed <= 0) continue;
      const tss = computeRtss(run.movingTime, run.distance, thresholdSecsPerMile);
      const key = run.startDate.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + tss);
    }

    const tssHistory: TssEntry[] = Array.from(dayMap.entries()).map(([date, tss]) => ({
      date,
      tss,
    }));

    const ctl = computeEwma(tssHistory, 42);
    const atl = computeEwma(tssHistory, 7);
    const tsb = ctl - atl;

    return { ctl, atl, tsb, tssHistory, thresholdSecsPerMile, avgWeeklyMiles };
  } catch {
    return {
      ctl: null,
      atl: null,
      tsb: null,
      tssHistory: [],
      thresholdSecsPerMile: null,
      avgWeeklyMiles: null,
    };
  }
}

async function computeBehavioralSignals(userId: string): Promise<BehavioralResult> {
  try {
    const d28 = new Date();
    d28.setDate(d28.getDate() - 28);
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);

    const workouts = await db.workout.findMany({
      where: {
        userId,
        scheduledDate: { gte: d28 },
        type: { not: "REST" },
      },
      select: { status: true, perceivedEffort: true, completedAt: true },
    });

    const completed = workouts.filter((w) => w.status === "COMPLETED");
    const completedWithRpe = completed.filter((w) => w.perceivedEffort != null);
    const completedWithRpe7d = completedWithRpe.filter(
      (w) => w.completedAt && w.completedAt >= d7,
    );

    const rpeAvg7d =
      completedWithRpe7d.length > 0
        ? completedWithRpe7d.reduce((s, w) => s + w.perceivedEffort!, 0) /
          completedWithRpe7d.length
        : null;
    const rpeAvg28d =
      completedWithRpe.length > 0
        ? completedWithRpe.reduce((s, w) => s + w.perceivedEffort!, 0) /
          completedWithRpe.length
        : null;
    const complianceRate28d =
      workouts.length > 0 ? completed.length / workouts.length : null;

    return { rpeAvg7d, rpeAvg28d, complianceRate28d };
  } catch {
    return { rpeAvg7d: null, rpeAvg28d: null, complianceRate28d: null };
  }
}

async function computeRecoveryPatterns(userId: string): Promise<RecoveryResult> {
  try {
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const recoveries = await db.whoopRecovery.findMany({
      where: { userId, date: { gte: d7 } },
      select: { recoveryScore: true, hrvRmssd: true, sleepScore: true },
    });

    if (recoveries.length === 0) {
      return { avgRecovery7d: null, avgHrv7d: null, avgSleepScore7d: null };
    }

    const avgRecovery7d =
      recoveries.reduce((s, r) => s + r.recoveryScore, 0) / recoveries.length;

    const withHrv = recoveries.filter((r) => r.hrvRmssd != null);
    const avgHrv7d =
      withHrv.length > 0
        ? withHrv.reduce((s, r) => s + r.hrvRmssd!, 0) / withHrv.length
        : null;

    const withSleep = recoveries.filter((r) => r.sleepScore != null);
    const avgSleepScore7d =
      withSleep.length > 0
        ? withSleep.reduce((s, r) => s + r.sleepScore!, 0) / withSleep.length
        : null;

    return { avgRecovery7d, avgHrv7d, avgSleepScore7d };
  } catch {
    return { avgRecovery7d: null, avgHrv7d: null, avgSleepScore7d: null };
  }
}

async function computeHyroxMetrics(
  userId: string,
  thresholdSecsPerMile: number | null,
): Promise<HyroxResult> {
  try {
    if (!thresholdSecsPerMile) return { projectedHyroxTime: null, stationReadiness: null, hyroxStationScores: null };

    const d42 = new Date();
    d42.setDate(d42.getDate() - 42);

    const [event, recentWorkouts] = await Promise.all([
      db.event.findFirst({
        where: {
          userId,
          type: {
            in: [
              "HYROX",
              "HYROX_WOMENS",
              "HYROX_DOUBLES",
              "HYROX_DOUBLES_MIXED",
              "HYROX_DOUBLES_MENS",
              "HYROX_DOUBLES_WOMENS",
            ],
          },
          isActive: true,
          date: { gte: new Date() },
        },
        orderBy: { date: "asc" },
        select: { type: true },
      }),
      db.workout.findMany({
        where: {
          userId,
          type: { in: ["HYROX_STATION_WORK", "HYROX_SIM", "STRENGTH"] },
          scheduledDate: { gte: d42 },
        },
        select: { status: true, type: true, title: true, description: true, perceivedEffort: true },
      }),
    ]);

    if (!event) return { projectedHyroxTime: null, stationReadiness: null, hyroxStationScores: null };

    const isDoubles = event.type.includes("DOUBLES");
    const runMiles = isDoubles ? 2.485 : 4.97;
    const baseStationSecs = isDoubles ? 25 * 60 : 20 * 60;

    const stationOnlyWorkouts = recentWorkouts.filter(w =>
      w.type === "HYROX_STATION_WORK" || w.type === "HYROX_SIM"
    );
    const stationCompleted = stationOnlyWorkouts.filter((w) => w.status === "COMPLETED").length;
    const stationReadiness =
      stationOnlyWorkouts.length > 0 ? stationCompleted / stationOnlyWorkouts.length : null;

    // Per-station scores
    const stationScoreMap = computeStationReadiness({
      ctl: null, // filled in after fitness metrics — passed as null here, proxy used
      complianceRate28d: null,
      recentWorkouts,
    });
    const hyroxStationScores: Record<string, number> = {};
    for (const [station, data] of Object.entries(stationScoreMap)) {
      hyroxStationScores[station] = data.score;
    }

    const runTimeSecs = thresholdSecsPerMile * runMiles * 1.05;
    const stationPenalty = (1 - (stationReadiness ?? 0.5)) * 10 * 60;
    const projectedHyroxTime = Math.round(runTimeSecs + baseStationSecs + stationPenalty);

    return { projectedHyroxTime, stationReadiness, hyroxStationScores };
  } catch {
    return { projectedHyroxTime: null, stationReadiness: null, hyroxStationScores: null };
  }
}

function identifyWeaknesses(
  f: FitnessResult,
  b: BehavioralResult,
  r: RecoveryResult,
): string[] {
  const weak: string[] = [];
  if (f.ctl != null && f.ctl < 30) weak.push("aerobic_base");
  if (f.avgWeeklyMiles != null && f.avgWeeklyMiles < 20) weak.push("aerobic_base");
  if (b.rpeAvg7d != null && b.rpeAvg7d > 7.5) weak.push("threshold_capacity");
  if (b.complianceRate28d != null && b.complianceRate28d < 0.7) weak.push("consistency");
  if (r.avgRecovery7d != null && r.avgRecovery7d < 50) weak.push("recovery_deficit");
  if (f.tsb != null && f.tsb < -20) weak.push("accumulated_fatigue");
  return [...new Set(weak)];
}

function assessInjuryRisk(
  f: FitnessResult,
  b: BehavioralResult,
  r: RecoveryResult,
): { injuryRiskFlag: boolean; injuryRiskNote: string | null } {
  const reasons: string[] = [];
  if (f.tsb != null && f.tsb < -30)
    reasons.push("acute fatigue significantly exceeds chronic fitness (TSB < -30)");
  if (b.rpeAvg7d != null && b.rpeAvg7d >= 8.5)
    reasons.push("sustained high RPE this week (≥8.5/10)");
  if (r.avgRecovery7d != null && r.avgRecovery7d < 34)
    reasons.push("WHOOP recovery in red zone all week");
  return {
    injuryRiskFlag: reasons.length >= 2,
    injuryRiskNote: reasons.length > 0 ? reasons.join("; ") : null,
  };
}

function computeDataConfidence(
  f: FitnessResult,
  b: BehavioralResult,
  r: RecoveryResult,
): number {
  let score = 0;
  if (f.tssHistory.length >= 20) score += 0.3;
  else if (f.tssHistory.length >= 5) score += 0.15;
  if (b.rpeAvg28d != null) score += 0.25;
  else if (b.rpeAvg7d != null) score += 0.1;
  if (b.complianceRate28d != null) score += 0.2;
  if (r.avgRecovery7d != null) score += 0.25;
  return Math.min(1, score);
}

export async function computeAthleteModel(userId: string): Promise<void> {
  // Debounce: skip if recomputed within the last hour
  const existing = await db.athleteModel.findUnique({
    where: { userId },
    select: { lastComputedAt: true },
  });
  if (existing && Date.now() - existing.lastComputedAt.getTime() < 60 * 60 * 1000) return;

  // Parallel pipeline — each sub-function catches its own errors
  const [fitness, behavioral, recovery] = await Promise.all([
    computeFitnessMetrics(userId),
    computeBehavioralSignals(userId),
    computeRecoveryPatterns(userId),
  ]);

  // Sequential: HYROX projection depends on threshold pace from fitness
  const hyrox = await computeHyroxMetrics(userId, fitness.thresholdSecsPerMile);

  const weaknesses = identifyWeaknesses(fitness, behavioral, recovery);
  const { injuryRiskFlag, injuryRiskNote } = assessInjuryRisk(fitness, behavioral, recovery);
  const dataConfidence = computeDataConfidence(fitness, behavioral, recovery);

  const payload = {
    ctl: fitness.ctl,
    atl: fitness.atl,
    tsb: fitness.tsb,
    tssHistory: fitness.tssHistory as object[],
    rpeAvg7d: behavioral.rpeAvg7d,
    rpeAvg28d: behavioral.rpeAvg28d,
    complianceRate28d: behavioral.complianceRate28d,
    avgWeeklyMiles: fitness.avgWeeklyMiles,
    avgRecovery7d: recovery.avgRecovery7d,
    avgHrv7d: recovery.avgHrv7d,
    avgSleepScore7d: recovery.avgSleepScore7d,
    projectedHyroxTime: hyrox.projectedHyroxTime,
    stationReadiness: hyrox.stationReadiness,
    hyroxStationScores: hyrox.hyroxStationScores as object ?? undefined,
    weaknesses,
    injuryRiskFlag,
    injuryRiskNote,
    dataConfidence,
    lastComputedAt: new Date(),
  };

  await db.athleteModel.upsert({
    where: { userId },
    create: { userId, ...payload },
    update: payload,
  });

  // Write back to AthleteProfile — activates the dead avgWeeklyEffort / consistencyScore fields
  const profileUpdate: Record<string, number> = {};
  if (behavioral.rpeAvg7d != null) profileUpdate.avgWeeklyEffort = behavioral.rpeAvg7d;
  if (behavioral.complianceRate28d != null)
    profileUpdate.consistencyScore = behavioral.complianceRate28d;
  if (Object.keys(profileUpdate).length > 0) {
    await db.athleteProfile
      .updateMany({ where: { userId }, data: profileUpdate })
      .catch(() => {});
  }
}
