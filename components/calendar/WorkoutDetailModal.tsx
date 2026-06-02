"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, MapPin, Clock, Zap, Target, CheckCircle2, XCircle, Pencil, MessageSquare } from "lucide-react";

export interface Workout {
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
  actualDistance: number | null;
  actualDuration: number | null;
  perceivedEffort: number | null;
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

const EVENT_DISTANCES_MI: Record<string, number> = {
  MARATHON: 26.2,
  HALF_MARATHON: 13.1,
  FIVE_K: 3.107,
  TEN_K: 6.214,
};

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

const EFFORT_LABELS: Record<number, string> = {
  1: "Very Easy", 2: "Easy", 3: "Moderate", 4: "Moderate+", 5: "Hard",
  6: "Hard+", 7: "Very Hard", 8: "Extremely Hard", 9: "Near Max", 10: "Max",
};

export function WorkoutDetailModal({
  workout,
  onClose,
  onWorkoutUpdated,
}: {
  workout: Workout;
  onClose: () => void;
  onWorkoutUpdated?: (id: string, updates: Partial<Workout>) => void;
}) {
  const router = useRouter();
  const isHyrox = workout.eventType.startsWith("HYROX");
  const accentColor = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";
  const canLog = workout.status === "SCHEDULED" && workout.type !== "REST";

  const [actualDist, setActualDist] = useState(
    workout.targetDistance != null ? String(workout.targetDistance) : ""
  );
  const [effort, setEffort] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Description editing
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(workout.description ?? "");
  const [descSaving, setDescSaving] = useState(false);

  const date = new Date(workout.scheduledDate);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  const targetPace = getTargetPace(workout.goalTime, workout.eventType, workout.intensityZone);
  const tip = WORKOUT_TIPS[workout.type];

  async function logWorkout(status: "COMPLETED" | "SKIPPED") {
    setSaving(true);
    setSaveError(null);
    const body: Record<string, unknown> = { status };
    if (status === "COMPLETED") {
      const dist = parseFloat(actualDist);
      if (!isNaN(dist) && dist > 0 && dist < 200) body.actualDistance = dist;
      if (effort != null) body.perceivedEffort = effort;
    }

    try {
      const res = await fetch(`/api/workouts/${workout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? "Failed to save. Try again.");
        return;
      }

      setSaved(true);
      onWorkoutUpdated?.(workout.id, {
        status,
        actualDistance: typeof body.actualDistance === "number" ? body.actualDistance : null,
        perceivedEffort: typeof body.perceivedEffort === "number" ? body.perceivedEffort : null,
      });
      setTimeout(onClose, 800);
    } catch {
      setSaveError("Connection error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDescription() {
    setDescSaving(true);
    try {
      const res = await fetch(`/api/workouts/${workout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDesc }),
      });
      if (res.ok) {
        onWorkoutUpdated?.(workout.id, { description: editDesc || null });
        setEditing(false);
      }
    } finally {
      setDescSaving(false);
    }
  }

  function askCoach() {
    const question = `I need help with my upcoming workout: ${workout.title} (${workout.type}) scheduled for ${dateStr}. ${workout.description ? `The description says: "${workout.description}". ` : ""}Can you give me detailed guidance, alternative exercises, and tips for this session?`;
    localStorage.setItem("coachPendingQuestion", question);
    onClose();
    router.push("/coach");
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
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
            {workout.status === "SKIPPED" && (
              <Badge variant="outline" className="text-[10px] border-muted-foreground text-muted-foreground">Skipped</Badge>
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
                  {workout.targetDistance % 1 === 0 ? workout.targetDistance : workout.targetDistance.toFixed(1)}
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

          {/* Description + edit */}
          <div className="space-y-2">
            {!editing ? (
              <>
                {workout.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {workout.description}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => { setEditDesc(workout.description ?? ""); setEditing(true); }}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <Pencil className="h-2.5 w-2.5" /> Customize session
                  </button>
                  <span className="text-muted-foreground/20 text-[10px]">·</span>
                  <button
                    onClick={askCoach}
                    className="flex items-center gap-1 text-[10px] hover:opacity-80 transition-opacity font-medium"
                    style={{ color: accentColor }}
                  >
                    <MessageSquare className="h-2.5 w-2.5" /> Ask coach
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">Session notes / custom exercises</Label>
                <Textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={5}
                  className="text-xs resize-none"
                  placeholder="Override the session description with your own notes, alternative exercises, or modified reps/weights…"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => setEditing(false)}
                    disabled={descSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs text-background"
                    style={{ backgroundColor: accentColor }}
                    onClick={saveDescription}
                    disabled={descSaving}
                  >
                    {descSaving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            )}
          </div>

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

          {/* Already logged */}
          {workout.status === "COMPLETED" && (
            <div className="rounded border border-green-600/20 bg-green-600/5 p-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600/80">Logged</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {workout.actualDistance != null && <span>{workout.actualDistance.toFixed(1)} mi actual</span>}
                {workout.actualDuration != null && <span>{workout.actualDuration} min</span>}
                {workout.perceivedEffort != null && <span>Effort {workout.perceivedEffort}/10</span>}
              </div>
            </div>
          )}

          {/* Log form */}
          {canLog && !saved && (
            <div className="rounded border border-border bg-muted/20 p-4 space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Log this workout</p>

              {workout.targetDistance != null && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Actual distance (mi)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={actualDist}
                    onChange={e => setActualDist(e.target.value)}
                    className="h-8 text-sm"
                    placeholder={String(workout.targetDistance)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Perceived effort (RPE)</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[2, 4, 6, 8, 10].map(v => (
                    <button
                      key={v}
                      onClick={() => setEffort(v)}
                      className={`rounded py-1.5 text-xs font-semibold transition-colors ${
                        effort === v
                          ? "text-background"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                      style={effort === v ? { backgroundColor: accentColor } : {}}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {effort != null && (
                  <p className="text-[10px] text-muted-foreground">{EFFORT_LABELS[effort]}</p>
                )}
              </div>

              {saveError && (
                <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/5 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{saveError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-red-500/30 text-muted-foreground hover:text-red-400 hover:border-red-500/60"
                  onClick={() => logWorkout("SKIPPED")}
                  disabled={saving}
                >
                  <XCircle className="h-3.5 w-3.5" /> Skip
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs text-background"
                  style={{ backgroundColor: accentColor }}
                  onClick={() => logWorkout("COMPLETED")}
                  disabled={saving}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Completed"}
                </Button>
              </div>
            </div>
          )}

          {saved && (
            <div className="flex items-center justify-center gap-2 py-3 text-green-500 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Logged!
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
