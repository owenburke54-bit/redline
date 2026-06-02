import { HAL_HIGDON_NOVICE, HAL_HIGDON_INTERMEDIATE, HAL_HIGDON_ADVANCED } from "./templates/halHigdon";
import { HYROX_8WK, HYROX_16WK } from "./templates/hyrox";
import { HALF_MARATHON_12WK } from "./templates/halfMarathon";
import { ULTRA_12WK } from "./templates/ultra";
import type { PlanTemplateData, TemplateWeek } from "./templates/types";

export type PlanTemplateKey =
  | "HAL_HIGDON_NOVICE"
  | "HAL_HIGDON_INTERMEDIATE"
  | "HAL_HIGDON_ADVANCED"
  | "HYROX_8WK"
  | "HYROX_16WK"
  | "HALF_MARATHON_12WK"
  | "ULTRA_12WK";

const TEMPLATES: Record<PlanTemplateKey, PlanTemplateData> = {
  HAL_HIGDON_NOVICE,
  HAL_HIGDON_INTERMEDIATE,
  HAL_HIGDON_ADVANCED,
  HYROX_8WK,
  HYROX_16WK,
  HALF_MARATHON_12WK,
  ULTRA_12WK,
};

export interface BuiltWorkout {
  scheduledDate: string; // ISO date string
  type: string;
  title: string;
  description: string;
  targetDistance?: number;
  targetDuration?: number;
  targetPace?: string;
  intensityZone?: number;
  stations?: unknown;
  isHyroxSim: boolean;
  week: number;
  phase: string;
}

export interface BuiltPlan {
  templateBase: PlanTemplateKey;
  totalWeeks: number;
  weeks: TemplateWeek[];
  workouts: BuiltWorkout[];
}

const HYROX_EVENT_TYPES = new Set([
  "HYROX",
  "HYROX_WOMENS",
  "HYROX_DOUBLES",
  "HYROX_DOUBLES_MIXED",
  "HYROX_DOUBLES_MENS",
  "HYROX_DOUBLES_WOMENS",
]);

const ULTRA_EVENT_TYPES = new Set(["ULTRA_50K", "ULTRA_50M"]);

const TRIATHLON_EVENT_TYPES = new Set([
  "TRIATHLON_SPRINT",
  "TRIATHLON_OLYMPIC",
  "HALF_IRONMAN",
  "IRONMAN",
]);

export function selectTemplate(
  eventType: string,
  raceDate: Date,
  dedicationScore: number,
  weeklyMileageBaseline?: number | null
): PlanTemplateKey {
  const weeksOut = Math.ceil((raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7));

  if (HYROX_EVENT_TYPES.has(eventType)) {
    return weeksOut >= 14 ? "HYROX_16WK" : "HYROX_8WK";
  }

  if (ULTRA_EVENT_TYPES.has(eventType)) {
    return "ULTRA_12WK";
  }

  if (eventType === "HALF_MARATHON") {
    return "HALF_MARATHON_12WK";
  }

  if (TRIATHLON_EVENT_TYPES.has(eventType)) {
    // Triathlon plans require swim/bike workouts not yet in the system.
    // Callers should check for this and surface a "coming soon" error.
    // Fallback to marathon novice so the plan system doesn't hard-fail.
    return "HAL_HIGDON_NOVICE";
  }

  // Marathon / 5K / 10K — select based on dedication + baseline mileage
  const isExperienced = (weeklyMileageBaseline ?? 0) >= 40 || dedicationScore >= 8;
  const isIntermediate = (weeklyMileageBaseline ?? 0) >= 25 || dedicationScore >= 6;

  if (isExperienced) return "HAL_HIGDON_ADVANCED";
  if (isIntermediate) return "HAL_HIGDON_INTERMEDIATE";
  return "HAL_HIGDON_NOVICE";
}

export function isTriathlonEvent(eventType: string): boolean {
  return TRIATHLON_EVENT_TYPES.has(eventType);
}

export function buildPlan(
  templateKey: PlanTemplateKey,
  raceDate: Date
): BuiltPlan {
  const template = TEMPLATES[templateKey];
  const totalWeeks = template.totalWeeks;

  // Work backwards from race date to find plan start (Monday)
  const raceDateMs = raceDate.getTime();
  const planStartMs = raceDateMs - (totalWeeks - 1) * 7 * 24 * 60 * 60 * 1000;
  const planStart = new Date(planStartMs);

  // Align to Monday
  const dayOfWeek = planStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  planStart.setDate(planStart.getDate() + daysToMonday);
  planStart.setHours(0, 0, 0, 0);

  const workouts: BuiltWorkout[] = [];

  for (const week of template.weeks) {
    const weekStartMs = planStart.getTime() + (week.week - 1) * 7 * 24 * 60 * 60 * 1000;

    for (const workout of week.workouts) {
      const workoutDate = new Date(weekStartMs + workout.day * 24 * 60 * 60 * 1000);

      workouts.push({
        scheduledDate: workoutDate.toISOString(),
        type: workout.type,
        title: workout.title,
        description: workout.description,
        targetDistance: workout.targetDistance,
        targetDuration: workout.targetDuration,
        targetPace: workout.targetPace,
        intensityZone: workout.intensityZone,
        stations: workout.stations ?? null,
        isHyroxSim: workout.isHyroxSim ?? false,
        week: week.week,
        phase: week.phase,
      });
    }
  }

  return {
    templateBase: templateKey,
    totalWeeks,
    weeks: template.weeks,
    workouts,
  };
}

export function getTemplate(key: PlanTemplateKey): PlanTemplateData {
  return TEMPLATES[key];
}

export function summarizePlanForAI(plan: BuiltPlan): string {
  const weekSummaries = plan.weeks.map(w => {
    const types = w.workouts.map(wo => wo.title).join(", ");
    return `Week ${w.week} (${w.phase}, ${w.totalMi}mi): ${types}`;
  });
  return weekSummaries.join("\n");
}
