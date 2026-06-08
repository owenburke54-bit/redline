"use client";

import { useState } from "react";
import { X, Zap } from "lucide-react";

interface PendingWorkout {
  id: string;
  title: string;
  type: string;
}

interface WorkoutRating {
  rpe: number | null;
  difficulty: "TOO_EASY" | "ABOUT_RIGHT" | "TOO_HARD" | null;
}

const RPE_COLOR: Record<number, string> = {
  1: "#4A9EFF", 2: "#4A9EFF", 3: "#4A9EFF",
  4: "#00E87A", 5: "#00E87A", 6: "#FFB800",
  7: "#FFB800", 8: "#FF2D2D", 9: "#FF2D2D", 10: "#FF2D2D",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  TOO_EASY: "Too Easy",
  ABOUT_RIGHT: "About Right",
  TOO_HARD: "Too Hard",
};

export function RpeNudgeCard({ workouts }: { workouts: PendingWorkout[] }) {
  const [ratings, setRatings] = useState<Record<string, WorkoutRating>>(
    Object.fromEntries(workouts.map((w) => [w.id, { rpe: null, difficulty: null }])),
  );
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  if (dismissed || workouts.length === 0) return null;

  const anyRated = Object.values(ratings).some((r) => r.rpe != null);

  async function handleSave() {
    const updates = Object.entries(ratings)
      .filter(([, r]) => r.rpe != null)
      .map(([workoutId, r]) => ({
        workoutId,
        rpe: r.rpe!,
        ...(r.difficulty ? { difficulty: r.difficulty } : {}),
      }));
    if (updates.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/workouts/bulk-rpe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      setDismissed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" style={{ color: "#FF5500" }} fill="currentColor" />
          <p
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Rate recent workouts
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-5">
        {workouts.map((w) => {
          const r = ratings[w.id];
          return (
            <div key={w.id}>
              <p className="text-[12px] font-semibold text-foreground/75 mb-2">{w.title}</p>

              {/* RPE pills 1–10 */}
              <div className="flex items-center gap-1 flex-wrap mb-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const active = r.rpe === n;
                  const col = RPE_COLOR[n];
                  return (
                    <button
                      key={n}
                      onClick={() =>
                        setRatings((prev) => ({
                          ...prev,
                          [w.id]: { ...prev[w.id], rpe: active ? null : n },
                        }))
                      }
                      className="h-7 w-7 rounded-md text-[11px] font-bold transition-all"
                      style={{
                        background: active ? col : "rgba(255,255,255,0.06)",
                        color: active ? "#000" : "rgba(255,255,255,0.3)",
                        border: `1px solid ${active ? col : "transparent"}`,
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
                <span
                  className="text-[9px] ml-1"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  RPE
                </span>
              </div>

              {/* Difficulty pills */}
              <div className="flex gap-1.5">
                {(["TOO_EASY", "ABOUT_RIGHT", "TOO_HARD"] as const).map((d) => {
                  const active = r.difficulty === d;
                  return (
                    <button
                      key={d}
                      onClick={() =>
                        setRatings((prev) => ({
                          ...prev,
                          [w.id]: { ...prev[w.id], difficulty: active ? null : d },
                        }))
                      }
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all"
                      style={{
                        background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                        color: active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {anyRated && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full py-2 rounded-lg text-[12px] font-bold transition-opacity"
          style={{ background: "#FF5500", color: "#fff", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
