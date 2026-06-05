export interface ReadinessResult {
  score: number;
  label: string;
  color: string;
  insight: string;
  breakdown: { sessions: number; volume: number; consistency: number; recovery: number };
}

export interface PredictedTime {
  formatted: string;
  seconds: number;
  confidence: "high" | "medium" | "low";
  basis: string;
}

const KEY_TYPES = new Set(["RACE", "HYROX_SIM", "LONG_RUN", "INTERVALS", "TEMPO"]);

export function computeWeekReadiness(
  workouts: { type: string; status: string }[]
): number | null {
  const nonRest = workouts.filter(w => w.type !== "REST");
  if (nonRest.length === 0) return null;
  let wDone = 0, wTotal = 0;
  for (const w of nonRest) {
    const wt = KEY_TYPES.has(w.type) ? 2 : 1;
    wTotal += wt;
    if (w.status === "COMPLETED") wDone += wt;
    else if (w.status === "MODIFIED") wDone += wt * 0.7;
  }
  return Math.round((wDone / wTotal) * 100);
}

export function computePlanReadiness(params: {
  weeks: {
    workouts: { type: string; status: string; targetDistance?: number | null; actualDistance?: number | null }[];
    isCurrentWeek: boolean;
    isPast: boolean;
    totalMiles: number;
  }[];
  whoopAvgRecovery: number | null;
}): ReadinessResult {
  const { weeks, whoopAvgRecovery } = params;
  const doneWeeks = weeks.filter(w => w.isPast || w.isCurrentWeek);

  if (doneWeeks.length === 0) {
    return {
      score: 50, label: "Not Started", color: "rgba(255,255,255,0.3)",
      insight: "Complete your first workout to start tracking readiness.",
      breakdown: { sessions: 50, volume: 50, consistency: 50, recovery: 65 },
    };
  }

  // Session compliance — key sessions weighted 2x
  let wDone = 0, wTotal = 0;
  for (const week of doneWeeks) {
    for (const w of week.workouts.filter(x => x.type !== "REST")) {
      const wt = KEY_TYPES.has(w.type) ? 2 : 1;
      wTotal += wt;
      if (w.status === "COMPLETED") wDone += wt;
      else if (w.status === "MODIFIED") wDone += wt * 0.7;
    }
  }
  const sessions = wTotal > 0 ? Math.round((wDone / wTotal) * 100) : 100;

  // Volume compliance
  const plannedMi = doneWeeks.reduce((s, w) => s + w.totalMiles, 0);
  const completedMi = doneWeeks.reduce((s, week) =>
    s + week.workouts
      .filter(w => w.status === "COMPLETED")
      .reduce((ms, w) => ms + (w.actualDistance ?? w.targetDistance ?? 0), 0), 0);
  const volume = plannedMi > 0 ? Math.min(105, Math.round((completedMi / plannedMi) * 100)) : 100;

  // Consistency — penalize zero-completion weeks in last 3
  const recent3 = doneWeeks.slice(-3);
  const zeroWeeks = recent3.filter(week => {
    const nonRest = week.workouts.filter(w => w.type !== "REST");
    return nonRest.length > 0 && !nonRest.some(w => w.status === "COMPLETED" || w.status === "MODIFIED");
  }).length;
  const consistency = Math.max(0, 100 - zeroWeeks * 35);

  const recovery = whoopAvgRecovery != null ? Math.round(whoopAvgRecovery) : 65;

  const score = Math.min(100, Math.round(
    sessions * 0.38 + volume * 0.32 + consistency * 0.18 + recovery * 0.12
  ));

  let label: string, color: string;
  if (score >= 88)      { label = "Race Ready"; color = "#00E87A"; }
  else if (score >= 72) { label = "On Track";   color = "#7FD147"; }
  else if (score >= 56) { label = "Some Gaps";  color = "#FFB800"; }
  else if (score >= 40) { label = "At Risk";    color = "#FF6B00"; }
  else                  { label = "Behind";     color = "#FF2D2D"; }

  let insight: string;
  if (zeroWeeks > 0 && consistency < 65) {
    insight = `${zeroWeeks} recent week${zeroWeeks > 1 ? "s" : ""} with zero completions — consistency is the priority right now.`;
  } else if (volume < sessions && volume < 68) {
    insight = `${Math.round(completedMi)}mi logged of ${Math.round(plannedMi)}mi planned — a mileage gap this size will show on race day.`;
  } else if (sessions < 68) {
    insight = "Key sessions (long runs, tempo, HYROX sim) carry the most fitness — prioritize these above all else.";
  } else if (whoopAvgRecovery != null && whoopAvgRecovery < 38) {
    insight = "Recovery has been consistently low — stress and sleep quality will suppress training adaptation.";
  } else {
    insight = "Training is landing well. Keep executing and trust the build.";
  }

  return { score, label, color, insight, breakdown: { sessions, volume, consistency, recovery } };
}

function secsToHMS(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Race-specific offset from threshold (LT/10K) pace in sec/mile
const RACE_PARAMS: Record<string, { miles: number; thresholdOffset: number }> = {
  FIVE_K:        { miles: 3.1,  thresholdOffset: -10 },
  TEN_K:         { miles: 6.2,  thresholdOffset: 0   },
  HALF_MARATHON: { miles: 13.1, thresholdOffset: 18  },
  MARATHON:      { miles: 26.2, thresholdOffset: 42  },
  ULTRA_50K:     { miles: 31.0, thresholdOffset: 90  },
  ULTRA_50M:     { miles: 50.0, thresholdOffset: 150 },
};

const VIABLE_MILES: Record<string, number> = {
  FIVE_K: 15, TEN_K: 20, HALF_MARATHON: 25, MARATHON: 35, ULTRA_50K: 45, ULTRA_50M: 55,
};

export function predictFinishTime(params: {
  eventType: string;
  thresholdSecsPerMile: number | null;
  avgWeeklyMiles: number;
  runCount: number;
  compliancePct: number;
}): PredictedTime | null {
  const { eventType, thresholdSecsPerMile, avgWeeklyMiles, runCount, compliancePct } = params;

  // HYROX prediction: 8km running + 8 stations
  if (eventType.startsWith("HYROX")) {
    if (!thresholdSecsPerMile || runCount < 5) return null;
    // Convert threshold (proxy for ~10K pace) to per-km
    const thresholdSecsPerKm = thresholdSecsPerMile / 1.609;
    // HYROX 1km segments run ~20 sec/km slower than standalone 10K pace (station fatigue)
    const hyroxKmPace = thresholdSecsPerKm + 20;
    const runSecs = 8 * hyroxKmPace;
    // Station time: scales inversely with weekly mileage (fitness proxy)
    let stationSecs =
      avgWeeklyMiles >= 35 ? 30 * 60
      : avgWeeklyMiles >= 25 ? 36 * 60
      : avgWeeklyMiles >= 15 ? 43 * 60
      : 50 * 60;
    // Doubles: stations split between partners (roughly 55% of solo — transitions add time)
    const isDoubles = eventType.includes("DOUBLE");
    if (isDoubles) stationSecs = Math.round(stationSecs * 0.55);
    // Compliance penalty
    if (compliancePct < 60) stationSecs += 5 * 60;
    else if (compliancePct < 75) stationSecs += 150;
    const totalSecs = Math.round(runSecs + stationSecs);
    return {
      formatted: secsToHMS(totalSecs),
      seconds: totalSecs,
      confidence: runCount >= 15 ? "medium" : "low",
      basis: `${runCount} runs + station estimate`,
    };
  }

  const race = RACE_PARAMS[eventType];
  if (!race || !thresholdSecsPerMile || runCount < 5) return null;

  let racePace = thresholdSecsPerMile + race.thresholdOffset;

  // Training compliance adjustment
  if (compliancePct < 60)      racePace += 30;
  else if (compliancePct < 75) racePace += 15;
  else if (compliancePct < 85) racePace += 5;
  else if (compliancePct >= 90) racePace -= 5;

  // Volume penalty for under-trained athletes
  const needed = VIABLE_MILES[eventType] ?? 25;
  if (avgWeeklyMiles < needed * 0.55)      racePace += 25;
  else if (avgWeeklyMiles < needed * 0.78) racePace += 12;

  const totalSecs = Math.round(racePace * race.miles);

  return {
    formatted: secsToHMS(totalSecs),
    seconds: totalSecs,
    confidence: runCount >= 20 ? "high" : runCount >= 10 ? "medium" : "low",
    basis: `${runCount} runs analyzed`,
  };
}
