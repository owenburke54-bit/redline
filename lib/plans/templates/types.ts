export type WorkoutType =
  | "EASY_RUN"
  | "LONG_RUN"
  | "TEMPO"
  | "INTERVALS"
  | "HYROX_STATION_WORK"
  | "HYROX_SIM"
  | "STRENGTH"
  | "CROSS_TRAIN"
  | "REST"
  | "RACE";

export interface TemplateWorkout {
  day: number; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  type: WorkoutType;
  title: string;
  description: string;
  targetDistance?: number; // km
  targetDuration?: number; // minutes
  targetPace?: string;
  intensityZone?: number; // 1-5
  stations?: HyroxStation[];
  isHyroxSim?: boolean;
}

export interface HyroxStation {
  station: string;
  distance?: string;
  reps?: number;
  weightKg?: number;
  type?: string;
}

export interface TemplateWeek {
  week: number;
  phase: string; // "Base" | "Build" | "Peak" | "Taper" | "Race"
  totalKm: number;
  workouts: TemplateWorkout[];
}

export interface PlanTemplateData {
  name: string;
  totalWeeks: number;
  weeks: TemplateWeek[];
}
