export interface TrainingZones {
  easyPace: { min: string; max: string } | null;
  longRunPace: { min: string; max: string } | null;
  tempoPace: { min: string; max: string } | null;
  intervalPace: { min: string; max: string } | null;
  thresholdSecsPerMile: number | null;
  runCount: number;
  avgWeeklyMiles: number;
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

export function computeTrainingZones(
  activities: { distance: number; movingTime: number; averageSpeed: number | null; startDate: Date }[]
): TrainingZones {
  const runs = activities
    .filter((a) => a.distance >= 3000 && a.averageSpeed && a.averageSpeed > 0)
    .map((a) => ({
      distanceMi: a.distance / 1609.34,
      secsPerMile: secsToMinPerMile(a.averageSpeed!),
      startDate: a.startDate,
    }));

  const emptyZones: TrainingZones = {
    easyPace: null, longRunPace: null, tempoPace: null, intervalPace: null,
    thresholdSecsPerMile: null, runCount: runs.length, avgWeeklyMiles: 0,
  };

  if (runs.length < 3) return emptyZones;

  // Weekly mileage average over last 4 weeks
  const fourWeeksAgo = new Date(Date.now() - 28 * 86_400_000);
  const recentMiles = runs
    .filter((r) => r.startDate >= fourWeeksAgo)
    .reduce((s, r) => s + r.distanceMi, 0);
  const avgWeeklyMiles = Math.round((recentMiles / 4) * 10) / 10;

  // Threshold estimate: median of top 25% fastest runs ≥ 5km
  // Top 25% of effort runs approximate lactate threshold pace
  const qualityRuns = [...runs]
    .filter((r) => r.distanceMi >= 3.1)
    .sort((a, b) => a.secsPerMile - b.secsPerMile);

  if (qualityRuns.length === 0) return { ...emptyZones, runCount: runs.length, avgWeeklyMiles };

  const topCount = Math.max(1, Math.ceil(qualityRuns.length * 0.25));
  const topRuns = qualityRuns.slice(0, topCount);
  const thresholdSecs = topRuns.reduce((s, r) => s + r.secsPerMile, 0) / topRuns.length;

  return {
    thresholdSecsPerMile: thresholdSecs,
    easyPace: paceRange(thresholdSecs + 90, 25),   // threshold + ~1:30
    longRunPace: paceRange(thresholdSecs + 65, 25), // threshold + ~1:05
    tempoPace: paceRange(thresholdSecs + 10, 12),   // ≈ threshold
    intervalPace: paceRange(thresholdSecs - 35, 15), // threshold − ~35sec
    runCount: runs.length,
    avgWeeklyMiles,
  };
}

export function buildStravaZoneContext(
  zones: TrainingZones,
  whoopRecoveryScore: number | null
): string {
  if (!zones.thresholdSecsPerMile) {
    return zones.runCount > 0
      ? `${zones.runCount} runs synced from Strava — not enough variety to estimate zones yet.`
      : "No recent Strava runs found. Sync Strava to get pace zone guidance.";
  }

  const zoneLines = [
    zones.easyPace ? `Easy: ${zones.easyPace.min}–${zones.easyPace.max}/mi` : null,
    zones.longRunPace ? `Long run: ${zones.longRunPace.min}–${zones.longRunPace.max}/mi` : null,
    zones.tempoPace ? `Tempo/threshold: ${zones.tempoPace.min}–${zones.tempoPace.max}/mi` : null,
    zones.intervalPace ? `Interval: ${zones.intervalPace.min}–${zones.intervalPace.max}/mi` : null,
  ].filter(Boolean);

  const recoveryModifier =
    whoopRecoveryScore != null
      ? whoopRecoveryScore < 34
        ? `Recovery is red (${Math.round(whoopRecoveryScore)}%) — target upper end of easy pace; avoid tempo or faster.`
        : whoopRecoveryScore >= 67
        ? `Recovery is green (${Math.round(whoopRecoveryScore)}%) — cleared for prescribed intensity.`
        : `Recovery is yellow (${Math.round(whoopRecoveryScore)}%) — stick to the lower end of prescribed effort.`
      : null;

  return [
    `Estimated zones from ${zones.runCount} Strava runs (avg ${zones.avgWeeklyMiles} mi/wk):`,
    ...zoneLines,
    recoveryModifier,
  ]
    .filter(Boolean)
    .join("\n");
}
