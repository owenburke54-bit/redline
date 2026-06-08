"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Check, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { WorkoutRowData } from "@/components/plan/WeekRow";
import { ZONE_LABELS } from "@/components/plan/WeekRow";

// ─── Type definitions ─────────────────────────────────────────────────────────

// New rich exercise schema
interface StrengthExercise {
  exercise: string;
  sets: number;
  reps: string;
  load: string;
  tempo: string;
  rest: string;
  stationTarget: string;
  coachingCue: string;
}

interface StrengthBlock {
  blockLabel: string;
  exercises: StrengthExercise[];
}

// New top-level strengthBlocks shape stored in DB
interface StrengthSession {
  sessionName?: string;
  phaseContext?: string;
  estimatedDuration?: string;
  equipmentNeeded?: string[];
  sessionCoachNote?: string;
  warmup?: string;
  blocks?: StrengthBlock[];
  finisher?: string | null;
  cooldown?: string;
}

// WorkoutRowData extended with rich strength fields (nullable — old workouts won't have them)
export interface WorkoutDetailData extends WorkoutRowData {
  strengthBlocks?: StrengthSession | null;
  warmup?: string | null;
  cooldown?: string | null;
  coachingCues?: string | null;
  scheduledDate?: string | null;
  intensityZone?: number | null;
  goalTime?: string | null;
  eventType?: string | null;
}

// ─── Style maps (mirrored from WeekRow) ───────────────────────────────────────

const WORKOUT_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  EASY_RUN:           { bg: "rgba(74,158,255,0.15)",  border: "rgba(74,158,255,0.4)",  text: "#4A9EFF" },
  LONG_RUN:           { bg: "rgba(255,184,0,0.15)",   border: "rgba(255,184,0,0.4)",   text: "#FFB800" },
  TEMPO:              { bg: "rgba(255,85,0,0.15)",    border: "rgba(255,85,0,0.4)",    text: "#FF5500" },
  INTERVALS:          { bg: "rgba(255,45,45,0.15)",   border: "rgba(255,45,45,0.4)",   text: "#FF2D2D" },
  HYROX_STATION_WORK: { bg: "rgba(0,232,122,0.12)",   border: "rgba(0,232,122,0.4)",   text: "#00E87A" },
  HYROX_SIM:          { bg: "rgba(0,232,122,0.25)",   border: "rgba(0,232,122,0.7)",   text: "#00E87A" },
  STRENGTH:           { bg: "rgba(168,85,247,0.15)",  border: "rgba(168,85,247,0.4)",  text: "#A855F7" },
  CROSS_TRAIN:        { bg: "rgba(45,212,191,0.15)",  border: "rgba(45,212,191,0.4)",  text: "#2dd4bf" },
  REST:               { bg: "rgba(85,85,85,0.1)",     border: "rgba(85,85,85,0.3)",    text: "#555555" },
  RACE:               { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.3)", text: "#F5F5F5" },
};

const TYPE_LABELS: Record<string, string> = {
  EASY_RUN: "Easy Run", LONG_RUN: "Long Run", TEMPO: "Tempo",
  INTERVALS: "Intervals", HYROX_STATION_WORK: "Station Work", HYROX_SIM: "HYROX Sim",
  STRENGTH: "Strength", CROSS_TRAIN: "Cross-Train", REST: "Rest", RACE: "Race",
};

// ─── Pace target calculation (mirrors WorkoutDetailModal logic) ───────────────

const HYROX_RUN_MI = 4.971;
const EVENT_DISTANCES_MI: Record<string, number> = {
  MARATHON: 26.2, HALF_MARATHON: 13.1, FIVE_K: 3.107, TEN_K: 6.214,
  HYROX: HYROX_RUN_MI, HYROX_WOMENS: HYROX_RUN_MI,
  HYROX_DOUBLES: HYROX_RUN_MI, HYROX_DOUBLES_MIXED: HYROX_RUN_MI,
  HYROX_DOUBLES_MENS: HYROX_RUN_MI, HYROX_DOUBLES_WOMENS: HYROX_RUN_MI,
};
const EVENT_RUN_FRACTION: Partial<Record<string, number>> = {
  HYROX: 0.5, HYROX_WOMENS: 0.5,
  HYROX_DOUBLES: 0.55, HYROX_DOUBLES_MIXED: 0.55,
  HYROX_DOUBLES_MENS: 0.55, HYROX_DOUBLES_WOMENS: 0.55,
};
const ZONE_PACE_OFFSETS: Record<number, number> = { 1: 150, 2: 90, 3: 20, 4: -15, 5: -60 };
const DEFAULT_ZONE: Partial<Record<string, number>> = {
  EASY_RUN: 2, LONG_RUN: 2, TEMPO: 3, INTERVALS: 5,
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
  eventType: string | null | undefined,
  zone: number | null | undefined,
  workoutType: string
): string | null {
  const effectiveZone = zone ?? DEFAULT_ZONE[workoutType];
  if (!goalTime || !effectiveZone || !eventType) return null;
  const distMi = EVENT_DISTANCES_MI[eventType];
  if (!distMi) return null;
  const totalSecs = parseGoalTimeSecs(goalTime);
  if (!totalSecs) return null;
  const runFraction = EVENT_RUN_FRACTION[eventType] ?? 1;
  const goalPacePerMile = (totalSecs * runFraction) / distMi;
  const offset = ZONE_PACE_OFFSETS[effectiveZone];
  if (offset === undefined) return null;
  const zonePace = goalPacePerMile + offset;
  if (zonePace <= 60 || zonePace > 1800) return null;
  return `${secsToMmss(zonePace)}/mi`;
}

const STATUS_OPTIONS = [
  { value: "COMPLETED", label: "Completed", color: "#00E87A" },
  { value: "SKIPPED",   label: "Skipped",   color: "#FF2D2D" },
  { value: "SCHEDULED", label: "Scheduled", color: "rgba(255,255,255,0.5)" },
] as const;

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          {label}
        </span>
        <span
          className="text-[10px] text-muted-foreground/40 transition-transform duration-150"
          style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[12px] text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">{children}</p>
        </div>
      )}
    </div>
  );
}

// ─── Exercise card (collapsed by default) ────────────────────────────────────

function ExerciseCard({ ex }: { ex: StrengthExercise }) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!(ex.load || ex.tempo || ex.rest || ex.stationTarget || ex.coachingCue);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}
    >
      {/* Always-visible row */}
      <button
        type="button"
        onClick={() => hasDetails && setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <p className="text-[14px] font-bold leading-snug flex-1">{ex.exercise}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded"
            style={{ background: "rgba(255,85,0,0.2)", color: "#FF5500" }}
          >
            {ex.sets}×{ex.reps}
          </span>
          {hasDetails && (
            <span
              className="text-[10px] text-muted-foreground/30 transition-transform duration-150"
              style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▾
            </span>
          )}
        </div>
      </button>

      {/* Expandable details */}
      {open && (
        <div className="px-3 pb-3 space-y-1.5" style={{ borderTop: "1px solid rgba(168,85,247,0.15)" }}>
          {ex.load && (
            <p className="text-[12px] text-muted-foreground/60 pt-2">{ex.load}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {ex.tempo && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>
                {ex.tempo}
              </span>
            )}
            {ex.rest && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                rest {ex.rest}
              </span>
            )}
          </div>
          {ex.stationTarget && (
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: "rgba(0,232,122,0.12)", color: "#00E87A", border: "1px solid rgba(0,232,122,0.25)" }}>
              → {ex.stationTarget}
            </span>
          )}
          {ex.coachingCue && (
            <p className="text-[12px] text-muted-foreground/50 italic leading-snug">{ex.coachingCue}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Strength blocks renderer ─────────────────────────────────────────────────

function StrengthSessionView({ session }: { session: StrengthSession }) {
  const blocks = session.blocks ?? [];
  const warmup = session.warmup;
  const cooldown = session.cooldown;
  const coachNote = session.sessionCoachNote;
  const finisher = session.finisher;
  const equipment = session.equipmentNeeded ?? [];

  return (
    <div className="space-y-3">
      {/* Coach note — prominent, orange, italic */}
      {coachNote && (
        <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(255,85,0,0.08)", border: "1px solid rgba(255,85,0,0.2)" }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,85,0,0.6)" }}>
            Coach note
          </p>
          <p className="text-[13px] italic leading-snug" style={{ color: "#FF5500" }}>
            {coachNote}
          </p>
        </div>
      )}

      {/* Duration pill */}
      {session.estimatedDuration && (
        <span
          className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {session.estimatedDuration}
        </span>
      )}

      {/* Warm-up collapsible */}
      {warmup && <CollapsibleSection label="Warm-up">{warmup}</CollapsibleSection>}

      {/* Blocks */}
      {blocks.map((block, bi) => (
        <div key={bi} className="space-y-2">
          {block.blockLabel && (
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
              {block.blockLabel}
            </p>
          )}
          {(block.exercises ?? []).map((ex, ei) => (
            <ExerciseCard key={ei} ex={ex} />
          ))}
        </div>
      ))}

      {/* Finisher */}
      {finisher && (
        <div
          className="rounded-lg px-3 py-2.5"
          style={{ background: "rgba(255,85,0,0.06)", border: "1px solid rgba(255,85,0,0.2)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="h-3 w-3" style={{ color: "#FF5500" }} />
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,85,0,0.7)" }}>
              Finisher
            </p>
          </div>
          <p className="text-[12px] text-muted-foreground/70 leading-relaxed">{finisher}</p>
        </div>
      )}

      {/* Cool-down collapsible */}
      {cooldown && <CollapsibleSection label="Cool-down">{cooldown}</CollapsibleSection>}

      {/* Equipment pills */}
      {equipment.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
            You&apos;ll need
          </p>
          <div className="flex flex-wrap gap-1.5">
            {equipment.map((item, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WorkoutDetailSheetProps {
  workout: WorkoutDetailData | null;
  onClose: () => void;
  onWorkoutUpdated?: (id: string, updates: Record<string, unknown>) => void;
}

export function WorkoutDetailSheet({ workout, onClose, onWorkoutUpdated }: WorkoutDetailSheetProps) {
  const [status, setStatus] = useState<string>("SCHEDULED");
  const [effort, setEffort] = useState("");
  const [actualDistance, setActualDistance] = useState("");
  const [perceivedDifficulty, setPerceivedDifficulty] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Sync local state when workout changes
  useEffect(() => {
    if (workout) {
      setStatus(STATUS_OPTIONS.some(o => o.value === workout.status) ? workout.status : "SCHEDULED");
      setEffort(workout.perceivedEffort != null ? String(workout.perceivedEffort) : "");
      setActualDistance(workout.actualDistance != null ? String(workout.actualDistance) : "");
      setPerceivedDifficulty((workout as WorkoutDetailData & { perceivedDifficulty?: string | null }).perceivedDifficulty ?? null);
    }
  }, [workout?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll without jumping — iOS requires position:fixed with saved scroll position
  useEffect(() => {
    if (workout) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, parseInt(top || "0") * -1);
    }
    return () => {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (top) window.scrollTo(0, parseInt(top) * -1);
    };
  }, [workout]);

  const save = useCallback(async () => {
    if (!workout) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { status };
      const effortNum = effort !== "" ? parseInt(effort, 10) : null;
      const distNum = actualDistance !== "" ? parseFloat(actualDistance) : null;
      if (effortNum != null && effortNum >= 1 && effortNum <= 10) body.perceivedEffort = effortNum;
      if (distNum != null && distNum > 0) body.actualDistance = distNum;
      body.perceivedDifficulty = perceivedDifficulty;

      const res = await fetch(`/api/workouts/${workout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Workout updated.");
      onWorkoutUpdated?.(workout.id, body);
      router.refresh();
      onClose();
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }, [workout, status, effort, actualDistance, perceivedDifficulty, onClose, onWorkoutUpdated, router]);

  // Don't render on desktop (md+). Use a CSS media query via a hidden/visible trick.
  // We render the portal but make it invisible at md+ via CSS.
  if (!workout) return null;

  const s = WORKOUT_STYLE[workout.type] ?? WORKOUT_STYLE.REST;
  const wd = workout as WorkoutDetailData;
  const targetPaceFromGoal = getTargetPace(wd.goalTime, wd.eventType, wd.intensityZone, workout.type);
  const rawStrength = wd.strengthBlocks as StrengthSession | null | undefined;
  const hasStrengthBlocks =
    rawStrength != null &&
    typeof rawStrength === "object" &&
    Array.isArray((rawStrength as StrengthSession).blocks) &&
    ((rawStrength as StrengthSession).blocks?.length ?? 0) > 0;

  const formattedDate = workout.scheduledDate
    ? (() => {
        try {
          return new Date(workout.scheduledDate).toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric",
          });
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <>
      {/* Only render on mobile — hidden md+ */}
      <div className="md:hidden">
        {/* Overlay */}
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Sheet */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl overflow-hidden animate-sheet-up"
          style={{
            background: "var(--color-bg-surface, #111111)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderBottom: "none",
            maxHeight: "90vh",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>

          {/* Header */}
          <div
            className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {/* Type badge */}
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                >
                  {TYPE_LABELS[workout.type] ?? workout.type}
                </span>

                {/* Status badge */}
                {workout.status === "COMPLETED" && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: "rgba(0,232,122,0.15)", color: "#00E87A" }}
                  >
                    <Check className="h-2.5 w-2.5" /> Done
                  </span>
                )}
                {workout.status === "SKIPPED" && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: "rgba(255,45,45,0.15)", color: "#FF2D2D" }}
                  >
                    Skipped
                  </span>
                )}
              </div>
              <h2 className="text-[18px] font-black leading-tight tracking-tight">
                {workout.title}
              </h2>
              {formattedDate && (
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">{formattedDate}</p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-muted-foreground/40 hover:text-muted-foreground/80 mt-0.5"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Targets row */}
            {(workout.targetDistance || workout.targetDuration || workout.targetPace || workout.intensityZone) && (
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {workout.targetDistance && (
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">Distance</p>
                    <p className="text-[15px] font-black tabular-nums leading-tight">{workout.targetDistance}mi</p>
                  </div>
                )}
                {workout.targetDuration && (
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">Duration</p>
                    <p className="text-[15px] font-black tabular-nums leading-tight">{workout.targetDuration}min</p>
                  </div>
                )}
                {workout.targetPace && (
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">Target Pace</p>
                    <p className="text-[15px] font-black tabular-nums leading-tight">{workout.targetPace}/mi</p>
                  </div>
                )}
                {workout.intensityZone && ZONE_LABELS[workout.intensityZone] && (
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">Zone</p>
                    <p className="text-[15px] font-black leading-tight">
                      Z{workout.intensityZone}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground/50">
                        {ZONE_LABELS[workout.intensityZone]}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Target pace box — computed from goal time + zone */}
            {targetPaceFromGoal && (
              <div
                className="rounded-lg px-3 py-2.5 flex items-center justify-between"
                style={{ background: `${s.bg}`, border: `1px solid ${s.border}` }}
              >
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: s.text, opacity: 0.7 }}>
                    Target pace for this zone
                  </p>
                  <p className="text-[10px] text-muted-foreground/40">
                    Goal: {wd.goalTime}
                  </p>
                </div>
                <p className="text-[1.5rem] font-black tabular-nums leading-none" style={{ color: s.text }}>
                  {targetPaceFromGoal}
                </p>
              </div>
            )}

            {/* Description / Strength blocks */}
            {hasStrengthBlocks ? (
              <StrengthSessionView session={rawStrength as StrengthSession} />
            ) : (
              <div>
                {(workout as WorkoutDetailData).coachingCues && (
                  <p
                    className="text-[13px] font-semibold leading-snug mb-3"
                    style={{ color: "#FF5500" }}
                  >
                    {(workout as WorkoutDetailData).coachingCues}
                  </p>
                )}
                <p className="text-[13px] text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">
                  {workout.description}
                </p>
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

            {/* Inline log section */}
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                Log this workout
              </p>

              {/* Status buttons */}
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(opt => {
                  const active = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className="flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        background: active ? `${opt.color}20` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${active ? `${opt.color}50` : "rgba(255,255,255,0.08)"}`,
                        color: active ? opt.color : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* RPE + distance */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 block mb-1.5">
                    Effort (RPE 1–10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="—"
                    value={effort}
                    onChange={e => setEffort(e.target.value)}
                    className="w-20 h-9 px-3 rounded-md text-sm bg-transparent border text-foreground"
                    style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                </div>

                {workout.targetDistance != null && (
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 block mb-1.5">
                      Actual (mi)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder={String(workout.targetDistance)}
                      value={actualDistance}
                      onChange={e => setActualDistance(e.target.value)}
                      className="w-24 h-9 px-3 rounded-md text-sm bg-transparent border text-foreground"
                      style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                    />
                  </div>
                )}
              </div>

              {/* Perceived difficulty */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 block mb-1.5">
                  How did it feel?
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "TOO_EASY", label: "Too easy", color: "#4A9EFF" },
                    { value: "ABOUT_RIGHT", label: "About right", color: "#00E87A" },
                    { value: "TOO_HARD", label: "Too hard", color: "#FF2D2D" },
                  ].map(opt => {
                    const active = perceivedDifficulty === opt.value;
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => setPerceivedDifficulty(active ? null : opt.value)}
                        className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all"
                        style={{
                          background: active ? `${opt.color}20` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${active ? `${opt.color}50` : "rgba(255,255,255,0.08)"}`,
                          color: active ? opt.color : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer — save button */}
          <div
            className="px-5 py-4 shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full py-3.5 rounded-xl text-[13px] font-bold transition-opacity disabled:opacity-50"
              style={{ background: "#FF5500", color: "#080808" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
