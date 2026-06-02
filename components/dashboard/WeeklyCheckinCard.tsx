"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, AlertCircle } from "lucide-react";

export function WeeklyCheckinCard({
  completedCount,
  plannedCount,
}: {
  completedCount: number;
  plannedCount: number;
}) {
  const [effort, setEffort] = useState<number | null>(null);
  const [bodyFeel, setBodyFeel] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (effort == null || bodyFeel == null) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perceivedEffort: effort, bodyFeel, notes }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      setAiResponse(data.aiResponse ?? "Check-in saved.");
    } catch {
      setError("Connection error. Check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (aiResponse) {
    return (
      <div className="rounded-xl bg-card overflow-hidden">
        <div className="h-[3px] bg-primary" />
        <div className="p-5 space-y-3">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase">
            Weekly Check-in
          </p>
          <p className="text-[13px] text-foreground leading-relaxed">{aiResponse}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card overflow-hidden">
      <div className="h-[3px] bg-primary/40" />
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-1">
              Weekly Check-in
            </p>
            <p className="text-[13px] font-semibold text-foreground">How was your week?</p>
          </div>
          <MessageSquarePlus className="h-5 w-5 text-muted-foreground/30" />
        </div>

        {plannedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {completedCount}/{plannedCount} sessions logged this week.
          </p>
        )}

        <RatingRow
          label="Training effort"
          sublabel="How hard did you push?"
          value={effort}
          onChange={setEffort}
          lowLabel="Coasted"
          highLabel="Redlined"
        />

        <RatingRow
          label="Body feel"
          sublabel="Energy, soreness, recovery"
          value={bodyFeel}
          onChange={setBodyFeel}
          lowLabel="Wrecked"
          highLabel="Fresh"
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Notes (optional)</p>
          <Textarea
            placeholder="Anything the coach should know — travel, illness, life stress…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="h-20 text-xs resize-none"
            maxLength={500}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/5 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <Button
          className="w-full text-background"
          onClick={handleSubmit}
          disabled={effort == null || bodyFeel == null || loading}
        >
          {loading ? "Sending to coach…" : "Submit check-in"}
        </Button>
      </div>
    </div>
  );
}

function RatingRow({
  label,
  sublabel,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  sublabel: string;
  value: number | null;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sublabel}</p>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(v => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`rounded py-1.5 text-xs font-bold transition-colors ${
              value === v
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground/50">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
