"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Zap } from "lucide-react";

interface WorkoutCardProps {
  workout: {
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
  };
  onClick?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  EASY_RUN: "Easy",
  LONG_RUN: "Long Run",
  TEMPO: "Tempo",
  INTERVALS: "Intervals",
  HYROX_STATION_WORK: "Station Work",
  HYROX_SIM: "Hyrox Sim",
  STRENGTH: "Strength",
  CROSS_TRAIN: "Cross",
  REST: "Rest",
  RACE: "Race",
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "",
  COMPLETED: "opacity-60",
  SKIPPED: "opacity-40 line-through",
  MODIFIED: "",
};

export function WorkoutCard({ workout, onClick }: WorkoutCardProps) {
  const isHyrox = workout.eventType.startsWith("HYROX");
  const accentColor = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";
  const isRest = workout.type === "REST";

  if (isRest) {
    return (
      <div className="rounded border border-dashed border-border/40 px-2 py-1.5 text-xs text-muted-foreground/50 text-center">
        Rest
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded border border-border bg-card/60 px-2.5 py-2 hover:bg-card transition-colors",
        STATUS_STYLES[workout.status] ?? "",
        workout.conflictFlag && "border-red-500/50"
      )}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide leading-none"
          style={{ color: accentColor }}
        >
          {TYPE_LABELS[workout.type] ?? workout.type}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {workout.isHyroxSim && (
            <Zap className="h-2.5 w-2.5" style={{ color: "var(--hyrox-color)" }} />
          )}
          {workout.conflictFlag && (
            <AlertTriangle className="h-2.5 w-2.5 text-red-400" />
          )}
        </div>
      </div>

      <p className="text-xs font-medium leading-tight line-clamp-2">{workout.title}</p>

      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {workout.targetDistance != null && (
          <span className="text-[10px] text-muted-foreground">
            {workout.targetDistance % 1 === 0
              ? workout.targetDistance
              : workout.targetDistance.toFixed(1)}{" "}
            km
          </span>
        )}
        {workout.targetDuration != null && (
          <span className="text-[10px] text-muted-foreground">
            {workout.targetDuration}min
          </span>
        )}
        {workout.intensityZone != null && (
          <span className="text-[10px] text-muted-foreground">Z{workout.intensityZone}</span>
        )}
      </div>

      {workout.status === "COMPLETED" && (
        <div className="mt-1">
          <Badge variant="outline" className="text-[9px] px-1 py-0 border-green-600 text-green-600">
            Done
          </Badge>
        </div>
      )}
    </button>
  );
}
