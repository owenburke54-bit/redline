import { HAL_HIGDON_NOVICE, HAL_HIGDON_INTERMEDIATE, HAL_HIGDON_ADVANCED } from "./templates/halHigdon";
import { HYROX_8WK, HYROX_16WK } from "./templates/hyrox";
import type { PlanTemplateData, TemplateWeek } from "./templates/types";

export type PlanTemplateKey =
  | "HAL_HIGDON_NOVICE"
  | "HAL_HIGDON_INTERMEDIATE"
  | "HAL_HIGDON_ADVANCED"
  | "HYROX_8WK"
  | "HYROX_16WK";

const TEMPLATES: Record<PlanTemplateKey, PlanTemplateData> = {
  HAL_HIGDON_NOVICE,
  HAL_HIGDON_INTERMEDIATE,
  HAL_HIGDON_ADVANCED,
  HYROX_8WK,
  HYROX_16WK,
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

export function selectTemplate(
  eventType: string,
  raceDate: Date,
  dedicationScore: number,
  weeklyMileageBaseline?: number | null
): PlanTemplateKey {
  const weeksOut = Math.ceil((raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7));

  if (eventType === "HYROX" || eventType === "HYROX_DOUBLES") {
    return weeksOut >= 14 ? "HYROX_16WK" : "HYROX_8WK";
  }

  // Marathon/half marathon — select based on dedication + baseline mileage
  const isExperienced = (weeklyMileageBaseline ?? 0) >= 40 || dedicationScore >= 8;
  const isIntermediate = (weeklyMileageBaseline ?? 0) >= 25 || dedicationScore >= 6;

  if (isExperienced) return "HAL_HIGDON_ADVANCED";
  if (isIntermediate) return "HAL_HIGDON_INTERMEDIATE";
  return "HAL_HIGDON_NOVICE";
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
    return `Week ${w.week} (${w.phase}, ${w.totalKm}km): ${types}`;
  });
  return weekSummaries.join("\n");
}
