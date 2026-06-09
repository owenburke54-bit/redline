import {
  HYROX_STATION_ORDER,
  HYROX_STATION_LABELS,
  STATION_SEARCH_TERMS,
  STATION_TRAINING_TIPS,
  SPLITTABLE_STATIONS,
  TARGET_TOTAL_115,
  type HyroxStation,
} from "./constants";

export interface StationReadiness {
  score: number;            // 0-100
  confidence: "tracked" | "estimated" | "no_data";
  label: string;
  practiceCount: number;
  avgRpe: number | null;
  tips: string[];
}

export type StationReadinessMap = Record<HyroxStation, StationReadiness>;

export interface StationAssignment {
  station: HyroxStation;
  assignment: "OWEN" | "VICTORIA" | "SPLIT_EVEN" | "SPLIT_DOMINANT";
  owenPortion: string;
  victoriaPortion: string;
  reasoning: string;
}

export interface PartnerStrategy {
  status: "WAITING_FOR_PARTNER" | "ACTIVE";
  message: string;
  assignments: StationAssignment[] | null;
  predictedTime: number | null;
  predictedTimeLabel: string | null;
  vsTargetDelta: number | null;
}

interface WorkoutSignal {
  title: string;
  description: string;
  perceivedEffort: number | null;
  type: string;
  status: string;
}

function matchesStation(w: WorkoutSignal, station: HyroxStation): boolean {
  const haystack = `${w.title} ${w.description}`.toLowerCase();
  return STATION_SEARCH_TERMS[station].some(term => haystack.includes(term));
}

function averageRpe(workouts: WorkoutSignal[]): number | null {
  const withRpe = workouts.filter(w => w.perceivedEffort != null && w.status === "COMPLETED");
  if (withRpe.length === 0) return null;
  return withRpe.reduce((s, w) => s + w.perceivedEffort!, 0) / withRpe.length;
}

function practicePoints(count: number): number {
  return Math.min(count * 5, 40);
}

function rpePoints(avgRpe: number | null): number {
  if (avgRpe == null) return 15; // neutral estimate
  if (avgRpe <= 5) return 30;
  if (avgRpe <= 6) return 25;
  if (avgRpe <= 7) return 18;
  if (avgRpe <= 8) return 11;
  return 5;
}

function ctlPoints(ctl: number | null): number {
  if (!ctl) return 10;
  if (ctl >= 60) return 30;
  if (ctl >= 40) return 22;
  if (ctl >= 20) return 15;
  return 10;
}

function strengthPoints(strengthSessionCount: number): number {
  return Math.min(strengthSessionCount * 5, 30);
}

function getConfidence(practiceCount: number): StationReadiness["confidence"] {
  if (practiceCount >= 3) return "tracked";
  if (practiceCount >= 1) return "estimated";
  return "no_data";
}

function secsToMMSS(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatHyroxTime(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = Math.round(totalSecs % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function computeStationReadiness(params: {
  ctl: number | null;
  complianceRate28d: number | null;
  recentWorkouts: WorkoutSignal[];
}): StationReadinessMap {
  const { ctl, complianceRate28d, recentWorkouts } = params;

  const stationWorkouts = recentWorkouts.filter(
    w => w.type === "HYROX_STATION_WORK" || w.type === "HYROX_SIM"
  );
  const strengthWorkouts = recentWorkouts.filter(
    w => w.type === "STRENGTH" && w.status === "COMPLETED"
  );
  const strengthCount = strengthWorkouts.length;

  const AEROBIC_STATIONS = new Set<HyroxStation>(["SKI_ERG", "ROW_ERG", "BURPEE_BROAD_JUMP"]);
  const STRENGTH_STATIONS = new Set<HyroxStation>(["SLED_PUSH", "SLED_PULL", "FARMERS_CARRY"]);
  // SANDBAG_LUNGE, WALL_BALLS are mixed

  const result = {} as StationReadinessMap;

  for (const station of HYROX_STATION_ORDER) {
    const matching = stationWorkouts.filter(w => matchesStation(w, station));
    const practiceCount = matching.length;
    const avgRpe = averageRpe(matching);

    const pp = practicePoints(practiceCount);
    const rp = rpePoints(avgRpe);

    let proxyPoints: number;
    if (AEROBIC_STATIONS.has(station)) {
      proxyPoints = ctlPoints(ctl);
    } else if (STRENGTH_STATIONS.has(station)) {
      proxyPoints = strengthPoints(strengthCount);
    } else {
      // Mixed: blend aerobic + strength
      proxyPoints = Math.round(ctlPoints(ctl) * 0.5 + strengthPoints(strengthCount) * 0.5);
    }

    // Compliance penalty — athletes not showing up can't be ready
    let compliancePenalty = 0;
    if (complianceRate28d != null && complianceRate28d < 0.6) {
      compliancePenalty = 10;
    }

    const rawScore = pp + rp + proxyPoints - compliancePenalty;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    result[station] = {
      score,
      confidence: getConfidence(practiceCount),
      label: HYROX_STATION_LABELS[station],
      practiceCount,
      avgRpe,
      tips: STATION_TRAINING_TIPS[station].slice(0, 3),
    };
  }

  return result;
}

export function computePartnerStrategy(params: {
  owenReadiness: StationReadinessMap;
  victoriaReadiness: StationReadinessMap | null;
  owenCtl: number | null;
  victoriaCtl: number | null;
  targetTime?: number;
}): PartnerStrategy {
  const { owenReadiness, victoriaReadiness, targetTime = TARGET_TOTAL_115 } = params;

  if (!victoriaReadiness) {
    return {
      status: "WAITING_FOR_PARTNER",
      message: "Partner strategy unlocks once Victoria connects her account and completes training",
      assignments: null,
      predictedTime: null,
      predictedTimeLabel: null,
      vsTargetDelta: null,
    };
  }

  const assignments: StationAssignment[] = HYROX_STATION_ORDER.map(station => {
    const owenScore = owenReadiness[station].score;
    const victoriaScore = victoriaReadiness[station].score;
    const isSplittable = SPLITTABLE_STATIONS.includes(station);
    const scoreDiff = Math.abs(owenScore - victoriaScore);

    // Heavy stations (sled): give Owen benefit of doubt — men's weights are heavier
    const isHeavySled = station === "SLED_PUSH" || station === "SLED_PULL";
    const owenIsBetter = isHeavySled
      ? owenScore >= victoriaScore - 15
      : owenScore >= victoriaScore;

    if (isSplittable && scoreDiff < 10) {
      return {
        station,
        assignment: "SPLIT_EVEN" as const,
        owenPortion: "50%",
        victoriaPortion: "50%",
        reasoning: "Matched capacity — split evenly for optimal pacing",
      };
    }

    if (isSplittable && scoreDiff >= 10) {
      return {
        station,
        assignment: "SPLIT_DOMINANT" as const,
        owenPortion: owenIsBetter ? "70%" : "30%",
        victoriaPortion: owenIsBetter ? "30%" : "70%",
        reasoning: `${owenIsBetter ? "Owen" : "Victoria"} has stronger capacity — take larger share to protect partner`,
      };
    }

    return {
      station,
      assignment: owenIsBetter ? "OWEN" : "VICTORIA",
      owenPortion: owenIsBetter ? "100%" : "0%",
      victoriaPortion: owenIsBetter ? "0%" : "100%",
      reasoning: `Higher readiness (${Math.max(owenScore, victoriaScore)} vs ${Math.min(owenScore, victoriaScore)})`,
    };
  });

  // Rough predicted time from combined readiness
  const avgCombinedScore = HYROX_STATION_ORDER.reduce(
    (s, st) => s + (owenReadiness[st].score + victoriaReadiness[st].score) / 2, 0
  ) / 8;

  // Station time: 43min baseline for Mixed Doubles, scale by readiness
  const baseStationSecs = 43 * 60;
  const readinessFactor = 1 - (avgCombinedScore - 50) / 200; // 50 = baseline
  const stationSecs = Math.round(baseStationSecs * Math.max(0.75, Math.min(1.25, readinessFactor)));
  const runSecs = 32 * 60; // 8km @ 4:00/km baseline
  const predictedTime = runSecs + stationSecs;

  const weakestStation = HYROX_STATION_ORDER.reduce((worst, st) => {
    const avgScore = (owenReadiness[st].score + victoriaReadiness[st].score) / 2;
    const worstAvg = (owenReadiness[worst].score + victoriaReadiness[worst].score) / 2;
    return avgScore < worstAvg ? st : worst;
  });

  return {
    status: "ACTIVE",
    assignments,
    predictedTime,
    predictedTimeLabel: formatHyroxTime(predictedTime),
    vsTargetDelta: predictedTime - targetTime,
    message:
      predictedTime <= targetTime
        ? "On track for sub-1:15 — execute this split"
        : `${secsToMMSS(predictedTime - targetTime)} behind target — focus on ${HYROX_STATION_LABELS[weakestStation]}`,
  };
}
