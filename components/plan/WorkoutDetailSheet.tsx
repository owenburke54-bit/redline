"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { WorkoutRowData } from "@/components/plan/WeekRow";
import { ZONE_LABELS } from "@/components/plan/WeekRow";

// ─── Type definitions ─────────────────────────────────────────────────────────

interface StrengthBlock {
  exercise: string;
  sets: number;
  reps: string;
  load: string;
  tempo: string;
  rest: string;
  cue: string;
}

// WorkoutRowData extended with rich strength fields (nullable — old workouts won't have them)
export interface WorkoutDetailData extends WorkoutRowData {
  strengthBlocks?: StrengthBlock[] | null;
  warmup?: string | null;
  cooldown?: string | null;
  coachingCues?: string | null;
  scheduledDate?: string | null;
  intensityZone?: number | null;
}

// ─── Style maps (mirrored from WeekRow) ───────────────────────────────────────

const WORKOUT_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  EASY_RUN:           { bg: "rgba(99,102,241,0.18)",  border: "rgba(99,102,241,0.5)",  text: "#818cf8" },
  LONG_RUN:           { bg: "rgba(249,115,22,0.2)",   border: "rgba(249,115,22,0.5)",  text: "#fb923c" },
  TEMPO:              { bg: "rgba(234,179,8,0.2)",    border: "rgba(234,179,8,0.5)",   text: "#fbbf24" },
  INTERVALS:          { bg: "rgba(239,68,68,0.2)",    border: "rgba(239,68,68,0.5)",   text: "#f87171" },
  HYROX_STATION_WORK: { bg: "rgba(34,197,94,0.18)",   border: "rgba(34,197,94,0.5)",   text: "#4ade80" },
  HYROX_SIM:          { bg: "rgba(34,197,94,0.35)",   border: "rgba(34,197,94,0.8)",   text: "#22c55e" },
  STRENGTH:           { bg: "rgba(168,85,247,0.18)",  border: "rgba(168,85,247,0.5)",  text: "#c084fc" },
  CROSS_TRAIN:        { bg: "rgba(20,184,166,0.18)",  border: "rgba(20,184,166,0.5)",  text: "#2dd4bf" },
  REST:               { bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.15)" },
  RACE:               { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.4)", text: "#ffffff" },
};

const TYPE_LABELS: Record<string, string> = {
  EASY_RUN: "Easy Run", LONG_RUN: "Long Run", TEMPO: "Tempo",
  INTERVALS: "Intervals", HYROX_STATION_WORK: "Station Work", HYROX_SIM: "HYROX Sim",
  STRENGTH: "Strength", CROSS_TRAIN: "Cross-Train", REST: "Rest", RACE: "Race",
};

const STATUS_OPTIONS = [
  { value: "COMPLETED", label: "Completed", color: "#22c55e" },
  { value: "SKIPPED",   label: "Skipped",   color: "#ef4444" },
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

// ─── Strength blocks renderer ─────────────────────────────────────────────────

function StrengthBlockList({
  blocks,
  warmup,
  cooldown,
  coachingCues,
}: {
  blocks: StrengthBlock[];
  warmup?: string | null;
  cooldown?: string | null;
  coachingCues?: string | null;
}) {
  return (
    <div className="space-y-3">
      {coachingCues && (
        <p
          className="text-[13px] font-semibold leading-snug"
          style={{ color: "#fb923c" }}
        >
          {coachingCues}
        </p>
      )}

      {warmup && <CollapsibleSection label="Warm-up">{warmup}</CollapsibleSection>}

      <div className="space-y-2">
        {blocks.map((block, i) => (
          <div
            key={i}
            className="rounded-lg px-3 py-2.5 space-y-1"
            style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-bold leading-snug">{block.exercise}</p>
              <span
                className="shrink-0 text-[11px] font-bold tabular-nums px-2 py-0.5 rounded"
                style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc" }}
              >
                {block.sets}×{block.reps}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {block.load && (
                <span className="text-[11px] text-muted-foreground/60">{block.load}</span>
              )}
              {block.tempo && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                >
                  {block.tempo}
                </span>
              )}
              {block.rest && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                >
                  rest {block.rest}
                </span>
              )}
            </div>

            {block.cue && (
              <p className="text-[11px] text-muted-foreground/50 italic leading-snug">{block.cue}</p>
            )}
          </div>
        ))}
      </div>

      {cooldown && <CollapsibleSection label="Cool-down">{cooldown}</CollapsibleSection>}
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
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Sync local state when workout changes
  useEffect(() => {
    if (workout) {
      setStatus(STATUS_OPTIONS.some(o => o.value === workout.status) ? workout.status : "SCHEDULED");
      setEffort(workout.perceivedEffort != null ? String(workout.perceivedEffort) : "");
      setActualDistance(workout.actualDistance != null ? String(workout.actualDistance) : "");
    }
  }, [workout?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (workout) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
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
  }, [workout, status, effort, actualDistance, onClose, onWorkoutUpdated, router]);

  // Don't render on desktop (md+). Use a CSS media query via a hidden/visible trick.
  // We render the portal but make it invisible at md+ via CSS.
  if (!workout) return null;

  const s = WORKOUT_STYLE[workout.type] ?? WORKOUT_STYLE.REST;
  const hasStrengthBlocks =
    Array.isArray((workout as WorkoutDetailData).strengthBlocks) &&
    ((workout as WorkoutDetailData).strengthBlocks?.length ?? 0) > 0;

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
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl overflow-hidden"
          style={{
            background: "hsl(var(--card))",
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
                    style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                  >
                    <Check className="h-2.5 w-2.5" /> Done
                  </span>
                )}
                {workout.status === "SKIPPED" && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
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

            {/* Description / Strength blocks */}
            {hasStrengthBlocks ? (
              <StrengthBlockList
                blocks={(workout as WorkoutDetailData).strengthBlocks!}
                warmup={(workout as WorkoutDetailData).warmup}
                cooldown={(workout as WorkoutDetailData).cooldown}
                coachingCues={(workout as WorkoutDetailData).coachingCues}
              />
            ) : (
              <div>
                {(workout as WorkoutDetailData).coachingCues && (
                  <p
                    className="text-[13px] font-semibold leading-snug mb-3"
                    style={{ color: "#fb923c" }}
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
              style={{ background: "#fb923c", color: "#000" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
