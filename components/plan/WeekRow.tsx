"use client";

import { useState, useCallback } from "react";
import { ChevronDown, Check, X, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { WorkoutEditDialog } from "@/components/plan/WorkoutEditDialog";

export type WorkoutRowData = {
  id: string;
  type: string;
  title: string;
  description: string;
  targetDistance: number | null;
  targetDuration: number | null;
  targetPace: string | null;
  status: string;
  dayOfWeek: number; // 0=Mon … 6=Sun
  perceivedEffort: number | null;
  actualDistance: number | null;
};

export type WeekRowData = {
  weekNumber: number;
  phase: string;
  totalMiles: number;
  workouts: WorkoutRowData[];
  completedCount: number;
  nonRestCount: number;
  isCurrentWeek: boolean;
  isPast: boolean;
  keySession: WorkoutRowData | null;
  accentColor: string;
};

const WORKOUT_STYLE: Record<string, { bg: string; border: string; text: string; short: string }> = {
  EASY_RUN:            { bg: "rgba(99,102,241,0.18)",  border: "rgba(99,102,241,0.5)",  text: "#818cf8", short: "E"   },
  LONG_RUN:            { bg: "rgba(249,115,22,0.2)",   border: "rgba(249,115,22,0.5)",  text: "#fb923c", short: "L"   },
  TEMPO:               { bg: "rgba(234,179,8,0.2)",    border: "rgba(234,179,8,0.5)",   text: "#fbbf24", short: "T"   },
  INTERVALS:           { bg: "rgba(239,68,68,0.2)",    border: "rgba(239,68,68,0.5)",   text: "#f87171", short: "I"   },
  HYROX_STATION_WORK:  { bg: "rgba(34,197,94,0.18)",   border: "rgba(34,197,94,0.5)",   text: "#4ade80", short: "HX"  },
  HYROX_SIM:           { bg: "rgba(34,197,94,0.35)",   border: "rgba(34,197,94,0.8)",   text: "#22c55e", short: "SIM" },
  STRENGTH:            { bg: "rgba(168,85,247,0.18)",  border: "rgba(168,85,247,0.5)",  text: "#c084fc", short: "STR" },
  CROSS_TRAIN:         { bg: "rgba(20,184,166,0.18)",  border: "rgba(20,184,166,0.5)",  text: "#2dd4bf", short: "XT"  },
  REST:                { bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.15)", short: "—"  },
  RACE:                { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.4)",  text: "#ffffff",  short: "RACE"},
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const TYPE_LABELS: Record<string, string> = {
  EASY_RUN: "Easy Run", LONG_RUN: "Long Run", TEMPO: "Tempo",
  INTERVALS: "Intervals", HYROX_STATION_WORK: "Station Work", HYROX_SIM: "HYROX Sim",
  STRENGTH: "Strength", CROSS_TRAIN: "Cross-Train", REST: "Rest", RACE: "Race",
};

const ZONE_LABELS: Record<number, string> = {
  1: "Recovery", 2: "Easy aerobic", 3: "Aerobic", 4: "Threshold", 5: "VO₂ max",
};

function WorkoutDayBlock({ workout }: { workout: WorkoutRowData | undefined }) {
  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center h-14 w-full rounded-lg"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.1)" }}>—</span>
      </div>
    );
  }
  const s = WORKOUT_STYLE[workout.type] ?? WORKOUT_STYLE.REST;
  const label = workout.targetDistance
    ? `${workout.targetDistance}mi`
    : workout.targetDuration
    ? `${workout.targetDuration}m`
    : s.short;

  const isCompleted = workout.status === "COMPLETED";
  const isSkipped = workout.status === "SKIPPED";

  return (
    <div
      className="flex flex-col items-center justify-center h-14 w-full rounded-lg relative overflow-hidden"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      {isCompleted && (
        <div className="absolute inset-0 rounded-lg" style={{ background: "rgba(34,197,94,0.08)" }} />
      )}
      {isSkipped && (
        <div className="absolute inset-0 rounded-lg" style={{ background: "rgba(239,68,68,0.08)" }} />
      )}
      <span className="text-[10px] font-bold tabular-nums relative z-10 leading-none" style={{ color: s.text }}>
        {label}
      </span>
      {isCompleted && (
        <span className="text-[8px] mt-0.5 relative z-10" style={{ color: "#22c55e" }}>✓</span>
      )}
    </div>
  );
}

function WorkoutStatusButtons({
  workoutId,
  status: initialStatus,
  planIsPaused,
}: {
  workoutId: string;
  status: string;
  planIsPaused: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const patch = useCallback(async (next: "COMPLETED" | "SKIPPED" | "SCHEDULED") => {
    setLoading(true);
    const prev = status;
    setStatus(next);
    try {
      const res = await fetch(`/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) setStatus(prev);
      else router.refresh();
    } catch {
      setStatus(prev);
    } finally {
      setLoading(false);
    }
  }, [workoutId, status, router]);

  if (planIsPaused) {
    return (
      <div
        className="flex items-center gap-1 opacity-30 cursor-not-allowed"
        title="Plan is paused — resume to log workouts"
      >
        <div className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/30">
          <Check className="h-3.5 w-3.5" />
        </div>
        <div className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/30">
          <X className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }

  if (status === "COMPLETED") {
    return (
      <button
        onClick={() => patch("SCHEDULED")}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors"
        style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)" }}
        title="Mark as not done"
      >
        <Check className="h-3 w-3" /> Done
      </button>
    );
  }
  if (status === "SKIPPED") {
    return (
      <button
        onClick={() => patch("SCHEDULED")}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors"
        style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
        title="Mark as not skipped"
      >
        <X className="h-3 w-3" /> Skipped
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => patch("COMPLETED")}
        disabled={loading}
        className="h-6 w-6 rounded flex items-center justify-center transition-colors hover:bg-green-500/20 text-muted-foreground/30 hover:text-green-400"
        title="Mark complete"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => patch("SKIPPED")}
        disabled={loading}
        className="h-6 w-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20 text-muted-foreground/30 hover:text-red-400"
        title="Mark skipped"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function WeekRow({
  week,
  defaultExpanded,
  planIsPaused = false,
}: {
  week: WeekRowData;
  defaultExpanded: boolean;
  planIsPaused?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editId, setEditId] = useState<string | null>(null);

  const editWorkout = editId ? week.workouts.find(w => w.id === editId) ?? null : null;

  // Build a slot array indexed by day-of-week (0=Mon…6=Sun)
  const slots: (WorkoutRowData | undefined)[] = Array(7).fill(undefined);
  for (const w of week.workouts) {
    if (w.dayOfWeek >= 0 && w.dayOfWeek <= 6) slots[w.dayOfWeek] = w;
  }

  const completionPct = week.nonRestCount > 0
    ? Math.round((week.completedCount / week.nonRestCount) * 100)
    : null;

  const keyStyle = week.keySession ? (WORKOUT_STYLE[week.keySession.type] ?? WORKOUT_STYLE.REST) : null;

  return (
    <>
      {editWorkout && (
        <WorkoutEditDialog
          key={editWorkout.id}
          workoutId={editWorkout.id}
          title={editWorkout.title}
          initialStatus={editWorkout.status}
          initialEffort={editWorkout.perceivedEffort}
          initialActualDistance={editWorkout.actualDistance}
          targetDistance={editWorkout.targetDistance}
          open={!!editId}
          onOpenChange={open => { if (!open) setEditId(null); }}
        />
      )}

      <div
        className="rounded-xl overflow-hidden transition-all duration-200"
        style={{
          background: week.isCurrentWeek ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
          border: week.isCurrentWeek
            ? `1px solid ${week.accentColor}40`
            : "1px solid rgba(255,255,255,0.06)",
          boxShadow: week.isCurrentWeek ? `0 0 0 1px ${week.accentColor}20` : "none",
        }}
      >
        {/* Week row header — always visible */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full text-left px-4 py-3 flex items-center gap-4 group"
        >
          {/* Week number */}
          <div className="shrink-0 w-10 text-right">
            <span className="text-[11px] font-black tabular-nums"
              style={{ color: week.isCurrentWeek ? week.accentColor : "rgba(255,255,255,0.3)" }}>
              W{week.weekNumber}
            </span>
          </div>

          {/* Day grid */}
          <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {slots.map((w, i) => (
              <WorkoutDayBlock key={i} workout={w} />
            ))}
          </div>

          {/* Volume */}
          <div className="shrink-0 w-14 text-right">
            {week.totalMiles > 0 && (
              <>
                <p className="text-[13px] font-black tabular-nums leading-none"
                  style={{ color: week.isPast ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.85)" }}>
                  {week.totalMiles}
                </p>
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wide">mi</p>
              </>
            )}
          </div>

          {/* Key session */}
          <div className="shrink-0 w-36 hidden md:block">
            {week.keySession && keyStyle && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold truncate max-w-full"
                style={{ background: keyStyle.bg, color: keyStyle.text }}
              >
                {week.keySession.targetDistance
                  ? `${week.keySession.targetDistance}mi ${TYPE_LABELS[week.keySession.type] ?? week.keySession.type}`
                  : TYPE_LABELS[week.keySession.type] ?? week.keySession.title}
              </span>
            )}
          </div>

          {/* Completion / current badge */}
          <div className="shrink-0 w-12 text-right">
            {week.isCurrentWeek ? (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${week.accentColor}20`, color: week.accentColor }}>
                NOW
              </span>
            ) : week.isPast && completionPct !== null ? (
              <span className="text-[10px] font-bold tabular-nums"
                style={{ color: completionPct >= 80 ? "#22c55e" : completionPct >= 50 ? "#f59e0b" : "#ef4444" }}>
                {completionPct}%
              </span>
            ) : null}
          </div>

          {/* Expand toggle */}
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-muted-foreground/30 group-hover:text-muted-foreground/60"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="mt-3 space-y-1">
              {/* Day column labels */}
              <div className="grid gap-1 px-14 mb-2" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                {DAY_LABELS.map((d, i) => (
                  <p key={i} className="text-center text-[9px] font-semibold tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.2)" }}>
                    {d}
                  </p>
                ))}
              </div>

              {/* Workout cards */}
              {week.workouts
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map(w => {
                  const s = WORKOUT_STYLE[w.type] ?? WORKOUT_STYLE.REST;
                  if (w.type === "REST") return null;
                  return (
                    <div key={w.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                      style={{ background: "rgba(255,255,255,0.03)" }}>
                      <span className="text-[9px] font-semibold text-muted-foreground/40 w-6 mt-0.5 shrink-0 uppercase">
                        {DAY_LABELS[w.dayOfWeek]}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                        style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                        {TYPE_LABELS[w.type] ?? w.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold leading-tight">{w.title}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed line-clamp-2">
                          {w.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        {w.targetDistance && (
                          <p className="text-[11px] font-bold tabular-nums">{w.targetDistance}mi</p>
                        )}
                        {w.targetDuration && !w.targetDistance && (
                          <p className="text-[11px] font-bold tabular-nums">{w.targetDuration}min</p>
                        )}
                        {w.targetPace && (
                          <p className="text-[10px] text-muted-foreground/50">{w.targetPace}/mi</p>
                        )}
                        <div className="flex items-center gap-1 justify-end">
                          <WorkoutStatusButtons
                            workoutId={w.id}
                            status={w.status}
                            planIsPaused={planIsPaused}
                          />
                          <button
                            type="button"
                            onClick={() => setEditId(w.id)}
                            className="h-6 w-6 rounded flex items-center justify-center transition-colors hover:bg-white/10 text-muted-foreground/20 hover:text-muted-foreground/60"
                            title="Edit workout"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Keep the ZONE_LABELS export available for any future consumers
export { ZONE_LABELS };
