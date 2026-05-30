export interface TrainingZones {
  easyPace: { min: string; max: string } | null;
  longRunPace: { min: string; max: string } | null;
  tempoPace: { min: string; max: string } | null;
  intervalPace: { min: string; max: string } | null;
  thresholdSecsPerMile: number | null;
  estimatedMaxHR: number | null;
  runCount: number;
  matchedWithHR: number;
  avgWeeklyMiles: number;
  method: "hr_calibrated" | "pace_estimate" | "insufficient";
}

function secsToMinPerMile(metersPerSecond: number): number {
  return 1609.34 / metersPerSecond;
}

function formatPace(secsPerMile: number): string {
  const mins = Math.floor(secsPerMile / 60);
  const secs = Math.round(secsPerMile % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function paceRange(centerSecs: number, halfRangeSecs: number): { min: string; max: string } {
  return {
    min: formatPace(centerSecs - halfRangeSecs),
    max: formatPace(centerSecs + halfRangeSecs),
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function avg(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function computeTrainingZones(
  stravaRuns: {
    distance: number;
    movingTime: number;
    averageSpeed: number | null;
    averageHeartrate: number | null;
    maxHeartrate: number | null;
    startDate: Date;
  }[],
  whoopRunning: {
    startDate: Date;
    avgHeartRate: number | null;
    maxHeartRate: number | null;
  }[]
): TrainingZones {
  // 2400m min (filters sub-1.5mi treadmill warmups), pace 4:00–15:00/mi sanity bounds
  const qualityRuns = stravaRuns.filter((r) => {
    if (r.distance < 2400 || !r.averageSpeed || r.averageSpeed <= 0) return false;
    const secsPerMile = 1609.34 / r.averageSpeed;
    return secsPerMile >= 240 && secsPerMile <= 900;
  });

  const emptyZones: TrainingZones = {
    easyPace: null, longRunPace: null, tempoPace: null, intervalPace: null,
    thresholdSecsPerMile: null, estimatedMaxHR: null,
    runCount: qualityRuns.length, matchedWithHR: 0, avgWeeklyMiles: 0,
    method: "insufficient",
  };

  if (qualityRuns.length < 3) return emptyZones;

  // Weekly mileage average (last 4 weeks)
  const fourWeeksAgo = new Date(Date.now() - 28 * 86_400_000);
  const recentMiles = qualityRuns
    .filter((r) => r.startDate >= fourWeeksAgo)
    .reduce((s, r) => s + r.distance / 1609.34, 0);
  const avgWeeklyMiles = Math.round((recentMiles / 4) * 10) / 10;

  // Build WHOOP running lookup by date
  const whoopByDate = new Map<string, { avgHR: number | null; maxHR: number | null }>();
  for (const w of whoopRunning) {
    whoopByDate.set(dateKey(w.startDate), {
      avgHR: w.avgHeartRate,
      maxHR: w.maxHeartRate,
    });
  }

  // Collect all known max HR values to estimate true max HR
  const allMaxHR: number[] = [];
  for (const w of whoopRunning) {
    if (w.maxHeartRate) allMaxHR.push(w.maxHeartRate);
  }
  for (const r of qualityRuns) {
    if (r.maxHeartrate) allMaxHR.push(r.maxHeartrate);
  }
  allMaxHR.sort((a, b) => a - b);
  const estimatedMaxHR = allMaxHR.length >= 3 ? percentile(allMaxHR, 0.95) : null;

  // Match each Strava run to a WHOOP HR reading (prefer WHOOP, fall back to Strava)
  interface MatchedRun {
    secsPerMile: number;
    avgHR: number;
    distanceMi: number;
  }
  const matched: MatchedRun[] = [];

  for (const run of qualityRuns) {
    const secsPerMile = secsToMinPerMile(run.averageSpeed!);
    const whoopData = whoopByDate.get(dateKey(run.startDate));
    const avgHR = whoopData?.avgHR ?? run.averageHeartrate;
    if (!avgHR) continue;
    matched.push({ secsPerMile, avgHR, distanceMi: run.distance / 1609.34 });
  }

  const matchedWithHR = matched.length;

  // --- HR-calibrated zones (preferred when we have enough matched data) ---
  if (estimatedMaxHR && matchedWithHR >= 5) {
    const z = (lo: number, hi: number) =>
      matched.filter((r) => r.avgHR >= estimatedMaxHR * lo && r.avgHR < estimatedMaxHR * hi);

    const z2 = z(0.60, 0.71); // easy
    const z3 = z(0.71, 0.81); // aerobic / long run
    const z4 = z(0.81, 0.91); // tempo / threshold

    // Fall back to pace-estimate if a zone is empty
    const sortedByPace = [...matched].sort((a, b) => a.secsPerMile - b.secsPerMile);
    const top25 = sortedByPace.slice(0, Math.max(1, Math.ceil(sortedByPace.length * 0.25)));
    const paceEstimateThreshold = avg(top25.map((r) => r.secsPerMile));

    const easyCenter = z2.length >= 2 ? avg(z2.map((r) => r.secsPerMile)) : paceEstimateThreshold + 90;
    const longCenter = z3.length >= 2 ? avg(z3.map((r) => r.secsPerMile)) : paceEstimateThreshold + 65;
    const tempoCenter = z4.length >= 2 ? avg(z4.map((r) => r.secsPerMile)) : paceEstimateThreshold + 10;
    const intervalCenter = tempoCenter - 35;

    return {
      easyPace: paceRange(easyCenter, 25),
      longRunPace: paceRange(longCenter, 20),
      tempoPace: paceRange(tempoCenter, 12),
      intervalPace: paceRange(intervalCenter, 15),
      thresholdSecsPerMile: tempoCenter,
      estimatedMaxHR: Math.round(estimatedMaxHR),
      runCount: qualityRuns.length,
      matchedWithHR,
      avgWeeklyMiles,
      method: "hr_calibrated",
    };
  }

  // --- Pace-estimate fallback (top 25% fastest runs as threshold proxy) ---
  const sorted = [...qualityRuns].sort((a, b) => secsToMinPerMile(a.averageSpeed!) - secsToMinPerMile(b.averageSpeed!));
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.25));
  const thresholdSecs = avg(sorted.slice(0, topCount).map((r) => secsToMinPerMile(r.averageSpeed!)));

  return {
    easyPace: paceRange(thresholdSecs + 90, 25),
    longRunPace: paceRange(thresholdSecs + 65, 25),
    tempoPace: paceRange(thresholdSecs + 10, 12),
    intervalPace: paceRange(thresholdSecs - 35, 15),
    thresholdSecsPerMile: thresholdSecs,
    estimatedMaxHR: estimatedMaxHR ? Math.round(estimatedMaxHR) : null,
    runCount: qualityRuns.length,
    matchedWithHR,
    avgWeeklyMiles,
    method: matchedWithHR > 0 ? "pace_estimate" : "pace_estimate",
  };
}

export function buildStravaZoneContext(
  zones: TrainingZones,
  whoopRecoveryScore: number | null
): string {
  if (zones.method === "insufficient") {
    return zones.runCount > 0
      ? `${zones.runCount} runs synced — need more variety to estimate zones.`
      : "No Strava runs found. Sync to get pace zone guidance.";
  }

  const methodNote =
    zones.method === "hr_calibrated"
      ? `HR-calibrated from ${zones.matchedWithHR} runs matched with WHOOP HR data${zones.estimatedMaxHR ? ` (est. max HR ${zones.estimatedMaxHR}bpm)` : ""}:`
      : `Estimated from ${zones.runCount} runs (${zones.avgWeeklyMiles} mi/wk avg):`;

  const zoneLines = [
    zones.easyPace ? `Easy (Z2): ${zones.easyPace.min}–${zones.easyPace.max}/mi` : null,
    zones.longRunPace ? `Long run (Z3): ${zones.longRunPace.min}–${zones.longRunPace.max}/mi` : null,
    zones.tempoPace ? `Tempo/threshold (Z4): ${zones.tempoPace.min}–${zones.tempoPace.max}/mi` : null,
    zones.intervalPace ? `Interval (Z5): ${zones.intervalPace.min}–${zones.intervalPace.max}/mi` : null,
  ].filter(Boolean);

  const recoveryModifier =
    whoopRecoveryScore != null
      ? whoopRecoveryScore < 34
        ? `Recovery is red (${Math.round(whoopRecoveryScore)}%) — target upper end of Z2 only, no threshold work.`
        : whoopRecoveryScore >= 67
        ? `Recovery is green (${Math.round(whoopRecoveryScore)}%) — cleared for full prescribed intensity.`
        : `Recovery is yellow (${Math.round(whoopRecoveryScore)}%) — lower end of prescribed zone; skip intervals.`
      : null;

  return [methodNote, ...zoneLines, recoveryModifier].filter(Boolean).join("\n");
}
