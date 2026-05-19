"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Clock, Zap, Target } from "lucide-react";

interface Workout {
  id: string;
  type: string;
  title: string;
  description: string | null;
  targetDistance: number | null;
  targetDuration: number | null;
  targetPace: string | null;
  intensityZone: number | null;
  isHyroxSim: boolean;
  status: string;
  conflictFlag: boolean;
  conflictNote: string | null;
  eventType: string;
  eventName: string;
  goalTime?: string | null;
  scheduledDate: string;
}

const TYPE_LABELS: Record<string, string> = {
  EASY_RUN: "Easy Run",
  LONG_RUN: "Long Run",
  TEMPO: "Tempo Run",
  INTERVALS: "Intervals",
  HYROX_STATION_WORK: "Station Work",
  HYROX_SIM: "Hyrox Simulation",
  STRENGTH: "Strength",
  CROSS_TRAIN: "Cross Training",
  REST: "Rest Day",
  RACE: "Race",
};

const ZONE_LABELS: Record<number, string> = {
  1: "Z1 — Recovery (50–60% max HR)",
  2: "Z2 — Aerobic Base (60–70% max HR)",
  3: "Z3 — Tempo (70–80% max HR)",
  4: "Z4 — Threshold (80–88% max HR)",
  5: "Z5 — VO2 Max (88–95% max HR)",
};

const WORKOUT_TIPS: Partial<Record<string, string>> = {
  EASY_RUN: "Nose-breathing test: if you can't breathe comfortably through your nose the whole time, you're going too hard.",
  LONG_RUN: "Bring fuel and water for anything over 75 min. Walk breaks don't slow you down — they keep you from blowing up in the back half.",
  TEMPO: "The 'comfortably hard' test: you can speak in 3–4 word bursts, not full sentences. If you're gasping, back off.",
  INTERVALS: "Full recovery between reps matters more than hitting a pace. Don't start the next rep still breathing hard.",
  HYROX_STATION_WORK: "Practice station transitions. In a race, 10 seconds wasted at each of 8 transitions adds 80+ seconds to your finish time.",
  HYROX_SIM: "Race-pace effort on all stations. Time yourself — this is the benchmark you'll compare future sims against.",
  STRENGTH: "Log the weights every session. Progress requires tracking. If you're not logging, you're guessing.",
  CROSS_TRAIN: "Keep it truly easy — heart rate in Zone 1 to low Zone 2. This is active recovery, not a second workout.",
};

// Pace guidance utilities
const EVENT_DISTANCES_MI: Record<string, number> = {
  MARATHON: 26.2,
  HALF_MARATHON: 13.1,
  FIVE_K: 3.107,
  TEN_K: 6.214,
};

// Seconds per mile relative to goal race pace per zone
const ZONE_PACE_OFFSETS: Record<number, number> = {
  1: 150,
  2: 90,
  3: 20,
  4: -15,
  5: -60,
};

function parseGoalTimeSecs(s: string): number | null {
  const cleaned = s.toLowerCase().replace(/^sub-?\s*/, "").trim();
  const parts = cleaned.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return null;
}

function secsToMmss(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTargetPace(
  goalTime: string | null | undefined,
  eventType: string,
  zone: number | null | undefined
): string | null {
  if (!goalTime || !zone) return null;
  const distMi = EVENT_DISTANCES_MI[eventType];
  if (!distMi) return null;
  const totalSecs = parseGoalTimeSecs(goalTime);
  if (!totalSecs) return null;
  const goalPacePerMile = totalSecs / distMi;
  const offset = ZONE_PACE_OFFSETS[zone];
  if (offset === undefined) return null;
  const zonePace = goalPacePerMile + offset;
  if (zonePace <= 60 || zonePace > 1800) return null;
  return `${secsToMmss(zonePace)}/mi`;
}

export function WorkoutDetailModal({
  workout,
  onClose,
}: {
  workout: Workout;
  onClose: () => void;
}) {
  const isHyrox = workout.eventType.startsWith("HYROX");
  const accentColor = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";

  const date = new Date(workout.scheduledDate);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const targetPace = getTargetPace(workout.goalTime, workout.eventType, workout.intensityZone);
  const tip = WORKOUT_TIPS[workout.type];

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              {TYPE_LABELS[workout.type] ?? workout.type}
            </span>
            {workout.isHyroxSim && (
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: "var(--hyrox-color)", color: "var(--hyrox-color)" }}>
                <Zap className="h-2.5 w-2.5 mr-0.5" /> Sim
              </Badge>
            )}
            {workout.status === "COMPLETED" && (
              <Badge variant="outline" className="text-[10px] border-green-600 text-green-600">Done</Badge>
            )}
          </div>
          <DialogTitle className="text-base">{workout.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{dateStr} · {workout.eventName}</p>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Targets */}
          <div className="grid grid-cols-3 gap-3">
            {workout.targetDistance != null && (
              <div className="rounded bg-muted/40 p-2.5 text-center">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-semibold">
                  {workout.targetDistance % 1 === 0
                    ? workout.targetDistance
                    : workout.targetDistance.toFixed(1)}
                </p>
                <p className="text-[10px] text-muted-foreground">mi</p>
              </div>
            )}
            {workout.targetDuration != null && (
              <div className="rounded bg-muted/40 p-2.5 text-center">
                <Clock className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-semibold">{workout.targetDuration}</p>
                <p className="text-[10px] text-muted-foreground">min</p>
              </div>
            )}
            {workout.targetPace && (
              <div className="rounded bg-muted/40 p-2.5 text-center">
                <Target className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-semibold">{workout.targetPace}</p>
                <p className="text-[10px] text-muted-foreground">/mi</p>
              </div>
            )}
            {workout.intensityZone != null && (
              <div className="rounded bg-muted/40 p-2.5 text-center col-span-full">
                <p className="text-xs font-medium">{ZONE_LABELS[workout.intensityZone] ?? `Zone ${workout.intensityZone}`}</p>
              </div>
            )}
          </div>

          {/* Target pace from goal time */}
          {targetPace && (
            <div className="rounded border p-3 flex items-center justify-between" style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Target pace for this zone</p>
                <p className="text-xs text-muted-foreground mt-0.5">Based on your goal: {workout.goalTime}</p>
              </div>
              <p className="text-lg font-bold tabular-nums" style={{ color: accentColor }}>{targetPace}</p>
            </div>
          )}

          {/* Description */}
          {workout.description && (
            <div>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {workout.description}
              </p>
            </div>
          )}

          {/* Coach tip */}
          {tip && (
            <div className="rounded bg-muted/30 border border-border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Coach tip</p>
              <p className="text-xs text-muted-foreground leading-snug">{tip}</p>
            </div>
          )}

          {/* Conflict */}
          {workout.conflictFlag && workout.conflictNote && (
            <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/5 p-3">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-snug">{workout.conflictNote}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
