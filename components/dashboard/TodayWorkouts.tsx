"use client";

import { useState } from "react";
import { Zap, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkoutDetailModal } from "@/components/calendar/WorkoutDetailModal";
import type { Workout } from "@/components/calendar/WorkoutDetailModal";

interface TodayWorkoutsProps {
  workouts: Workout[];
}

export function TodayWorkouts({ workouts: initial }: TodayWorkoutsProps) {
  const [workouts, setWorkouts] = useState<Workout[]>(initial);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [quickLog, setQuickLog] = useState<string | null>(null);
  const [actualDist, setActualDist] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (workouts.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No workouts scheduled today.</p>;
  }

  function handleWorkoutUpdated(id: string, updates: Partial<Workout>) {
    setWorkouts(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    setSelectedWorkout(null);
    setQuickLog(null);
    setSaveError(null);
  }

  async function patchWorkout(workoutId: string, body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/workouts/${workoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error ?? "Failed to save. Try again.");
      return false;
    }
    setSaveError(null);
    return true;
  }

  async function quickComplete(workout: Workout) {
    setSaving(true);
    const body: Record<string, unknown> = { status: "COMPLETED" };
    const dist = parseFloat(actualDist);
    if (!isNaN(dist) && dist > 0 && dist < 200) body.actualDistance = dist;

    const ok = await patchWorkout(workout.id, body);
    setSaving(false);
    if (ok) {
      handleWorkoutUpdated(workout.id, {
        status: "COMPLETED",
        actualDistance: typeof body.actualDistance === "number" ? body.actualDistance : null,
      });
      setActualDist("");
    }
  }

  async function quickSkip(workout: Workout) {
    const ok = await patchWorkout(workout.id, { status: "SKIPPED" });
    if (ok) handleWorkoutUpdated(workout.id, { status: "SKIPPED" });
  }

  return (
    <>
      {saveError && (
        <div className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/5 px-3 py-2 mb-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{saveError}</p>
        </div>
      )}

      <div className="space-y-2">
        {workouts.map(w => {
          const isHyrox = w.eventType.startsWith("HYROX");
          const color = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";
          const completed = w.status === "COMPLETED";
          const skipped = w.status === "SKIPPED";
          const isRest = w.type === "REST";
          const isQuickLogging = quickLog === w.id;

          return (
            <div key={w.id} className="relative rounded-xl bg-card overflow-hidden">
              <span
                className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                style={{ backgroundColor: color }}
              />

              <div className="flex items-center gap-4 px-5 py-4">
                <Zap className="h-4 w-4 shrink-0 ml-2" style={{ color }} />
                <div className="flex-1 min-w-0">
                  <button
                    className="text-[13px] font-semibold truncate hover:text-primary transition-colors text-left w-full"
                    onClick={() => setSelectedWorkout(w)}
                  >
                    {w.title}
                  </button>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{w.eventName}</p>
                </div>

                {completed ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ color, backgroundColor: `${color}18` }}>
                    done
                  </span>
                ) : skipped ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-muted-foreground bg-muted/30">
                    skipped
                  </span>
                ) : isRest ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-muted-foreground bg-muted/30">
                    rest
                  </span>
                ) : (
                  <button
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-muted-foreground bg-muted/20 hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      if (isQuickLogging) {
                        setQuickLog(null);
                        setSaveError(null);
                      } else {
                        setQuickLog(w.id);
                        setActualDist(w.targetDistance != null ? String(w.targetDistance) : "");
                      }
                    }}
                  >
                    {isQuickLogging ? "cancel" : "log"}
                  </button>
                )}
              </div>

              {isQuickLogging && (
                <div className="px-5 pb-4 space-y-3 border-t border-border/30 pt-3">
                  {w.targetDistance != null && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground shrink-0">Distance (mi)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="200"
                        value={actualDist}
                        onChange={e => setActualDist(e.target.value)}
                        className="h-7 text-xs flex-1"
                        placeholder={String(w.targetDistance)}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 text-xs border-muted text-muted-foreground hover:text-foreground"
                      onClick={() => quickSkip(w)}
                      disabled={saving}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Skip
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 text-xs text-background"
                      style={{ backgroundColor: color }}
                      onClick={() => quickComplete(w)}
                      disabled={saving}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {saving ? "Saving…" : "Complete"}
                    </Button>
                  </div>
                  <button
                    className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground underline-offset-2 underline w-full text-center"
                    onClick={() => { setQuickLog(null); setSelectedWorkout(w); }}
                  >
                    Add RPE + more detail →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedWorkout && (
        <WorkoutDetailModal
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onWorkoutUpdated={handleWorkoutUpdated}
        />
      )}
    </>
  );
}
