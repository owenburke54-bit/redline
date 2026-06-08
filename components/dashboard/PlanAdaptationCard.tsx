"use client";

import { useState } from "react";
import { X, TrendingDown, TrendingUp, RefreshCw, Zap, Shield } from "lucide-react";
import Link from "next/link";

type AdaptationType = "LOAD_REDUCTION" | "RECOVERY_WEEK" | "RAMP_CORRECTION" | "INTENSITY_SHIFT" | "LOAD_INCREASE";
type AdaptationSeverity = "LOW" | "MEDIUM" | "HIGH";

interface PlanAdaptation {
  id: string;
  adaptationType: AdaptationType;
  severity: AdaptationSeverity;
  triggerSignals: string[];
  weekRange: { from: number; to: number };
  workoutsModified: number;
  coachMessage: string;
  coachSummary: string;
  appliedAt: string;
}

interface Props {
  adaptation: PlanAdaptation;
  planId: string;
}

const TYPE_CONFIG: Record<AdaptationType, { label: string; color: string; icon: React.ReactNode }> = {
  LOAD_REDUCTION: {
    label: "Load Reduction",
    color: "#FFB800",
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  RECOVERY_WEEK: {
    label: "Recovery Week",
    color: "#4A9EFF",
    icon: <Shield className="h-3.5 w-3.5" />,
  },
  RAMP_CORRECTION: {
    label: "Ramp Correction",
    color: "#FF8C00",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
  },
  INTENSITY_SHIFT: {
    label: "Intensity Shift",
    color: "#A78BFA",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  LOAD_INCREASE: {
    label: "Load Increase",
    color: "#00E87A",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
};

const SEVERITY_COLORS: Record<AdaptationSeverity, string> = {
  LOW: "#FFB800",
  MEDIUM: "#FF8C00",
  HIGH: "#FF2D2D",
};

const SIGNAL_LABELS: Record<string, string> = {
  low_compliance: "Low compliance",
  low_recovery: "Low recovery",
  high_fatigue: "High fatigue",
  ramp_too_fast: "Ramp too fast",
  rpe_too_hard: "High RPE",
  rpe_too_easy: "Low RPE",
};

export function PlanAdaptationCard({ adaptation, planId }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const config = TYPE_CONFIG[adaptation.adaptationType];

  async function handleDismiss() {
    setDismissed(true);
    await fetch(`/api/plans/${planId}/adaptation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adaptationId: adaptation.id }),
    });
  }

  const coachHref = `/coach?context=${encodeURIComponent(`My plan was just adapted (${config.label.toLowerCase()}). ${adaptation.coachMessage}`)}`;

  return (
    <div
      className="rounded-xl p-4 relative"
      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${config.color}30` }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center transition-colors"
        style={{ color: "rgba(255,255,255,0.2)" }}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Header row */}
      <div className="flex items-start gap-2.5 pr-7 mb-3">
        {/* Severity dot */}
        <div
          className="h-2 w-2 rounded-full mt-1 shrink-0"
          style={{ background: SEVERITY_COLORS[adaptation.severity] }}
        />

        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <div className="flex items-center gap-1.5 mb-1">
            <span style={{ color: config.color }}>{config.icon}</span>
            <span className="text-[11px] font-bold" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-[9px] text-muted-foreground/30 uppercase tracking-wider">
              auto-applied
            </span>
          </div>

          {/* Coach message */}
          <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.7)" }}>
            {adaptation.coachMessage}
          </p>
        </div>
      </div>

      {/* Trigger signal pills */}
      {adaptation.triggerSignals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {adaptation.triggerSignals.map(signal => (
            <span
              key={signal}
              className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
            >
              {SIGNAL_LABELS[signal] ?? signal.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Footer: workouts modified + actions */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          {adaptation.workoutsModified > 0
            ? `${adaptation.workoutsModified} workout${adaptation.workoutsModified !== 1 ? "s" : ""} modified`
            : "No workouts modified"}
          {" · "}weeks {adaptation.weekRange.from}–{adaptation.weekRange.to}
        </span>

        <div className="flex items-center gap-2">
          <Link
            href={`/plan/${planId}`}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
          >
            See what changed
          </Link>
          <Link
            href={coachHref}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: `${config.color}18`, color: config.color }}
          >
            Ask coach
          </Link>
        </div>
      </div>
    </div>
  );
}
