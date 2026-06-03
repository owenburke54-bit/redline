"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  workoutId: string;
  title: string;
  initialStatus: string;
  initialEffort: number | null;
  initialActualDistance: number | null;
  initialPerceivedDifficulty?: string | null;
  targetDistance: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: "COMPLETED", label: "Completed", color: "#00E87A" },
  { value: "SKIPPED",   label: "Skipped",   color: "#FF2D2D" },
  { value: "SCHEDULED", label: "Scheduled", color: "rgba(255,255,255,0.5)" },
] as const;

export function WorkoutEditDialog({
  workoutId,
  title,
  initialStatus,
  initialEffort,
  initialActualDistance,
  initialPerceivedDifficulty,
  targetDistance,
  open,
  onOpenChange,
}: Props) {
  const [status, setStatus] = useState<string>(
    STATUS_OPTIONS.some(o => o.value === initialStatus) ? initialStatus : "SCHEDULED"
  );
  const [effort, setEffort] = useState(initialEffort != null ? String(initialEffort) : "");
  const [actualDistance, setActualDistance] = useState(
    initialActualDistance != null ? String(initialActualDistance) : ""
  );
  const [perceivedDifficulty, setPerceivedDifficulty] = useState<string | null>(initialPerceivedDifficulty ?? null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { status };
      const effortNum = effort !== "" ? parseInt(effort, 10) : null;
      const distNum = actualDistance !== "" ? parseFloat(actualDistance) : null;
      if (effortNum != null && effortNum >= 1 && effortNum <= 10) body.perceivedEffort = effortNum;
      if (distNum != null && distNum > 0) body.actualDistance = distNum;
      body.perceivedDifficulty = perceivedDifficulty;

      const res = await fetch(`/api/workouts/${workoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Workout updated.");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug pr-6">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Status selector */}
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2 block">
              Status
            </Label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => {
                const active = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
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

          {/* Effort (RPE) */}
          <div>
            <Label htmlFor="workout-effort" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2 block">
              Effort (RPE 1–10)
            </Label>
            <Input
              id="workout-effort"
              type="number"
              min="1"
              max="10"
              placeholder="—"
              value={effort}
              onChange={e => setEffort(e.target.value)}
              className="w-24 h-9 text-sm"
            />
          </div>

          {/* Actual distance — only for workouts that have a target distance */}
          {targetDistance != null && (
            <div>
              <Label htmlFor="workout-distance" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2 block">
                Actual distance (mi)
              </Label>
              <Input
                id="workout-distance"
                type="number"
                min="0"
                step="0.1"
                placeholder={String(targetDistance)}
                value={actualDistance}
                onChange={e => setActualDistance(e.target.value)}
                className="w-32 h-9 text-sm"
              />
            </div>
          )}

          {/* Perceived difficulty */}
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2 block">
              How did it feel?
            </Label>
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

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
