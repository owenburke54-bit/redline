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
  1: "Z1 — Recovery",
  2: "Z2 — Aerobic base",
  3: "Z3 — Tempo",
  4: "Z4 — Threshold",
  5: "Z5 — VO2 max",
};

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
  });

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
                <p className="text-[10px] text-muted-foreground">km</p>
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
                <p className="text-[10px] text-muted-foreground">/km</p>
              </div>
            )}
            {workout.intensityZone != null && (
              <div className="rounded bg-muted/40 p-2.5 text-center col-span-full">
                <p className="text-xs font-medium">{ZONE_LABELS[workout.intensityZone] ?? `Zone ${workout.intensityZone}`}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {workout.description && (
            <div>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {workout.description}
              </p>
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
