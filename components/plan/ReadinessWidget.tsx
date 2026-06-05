import { TrendingUp } from "lucide-react";
import type { ReadinessResult, PredictedTime } from "@/lib/plans/readiness";

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] text-muted-foreground/35 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>
        {value}%
      </span>
    </div>
  );
}

function barColor(value: number, isRecovery = false): string {
  const hi = isRecovery ? 67 : 80;
  const mid = isRecovery ? 34 : 60;
  if (value >= hi) return "#00E87A";
  if (value >= mid) return "#FFB800";
  return "#FF2D2D";
}

export function ReadinessWidget({
  readiness,
  predicted,
  accentColor,
}: {
  readiness: ReadinessResult;
  predicted: PredictedTime | null;
  accentColor: string;
}) {
  const hasRealRecovery = readiness.breakdown.recovery !== 65;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header row: score + predicted time */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-2">
            Race Readiness
          </p>
          <div className="flex items-baseline gap-2.5">
            <span
              className="text-[3.25rem] font-black leading-none tabular-nums"
              style={{ color: readiness.color }}
            >
              {readiness.score}
            </span>
            <span className="text-[14px] font-bold leading-none" style={{ color: readiness.color }}>
              {readiness.label}
            </span>
          </div>
        </div>

        {predicted && (
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-2">
              Predicted Finish
            </p>
            <p
              className="text-[2rem] font-black leading-none tabular-nums"
              style={{ color: accentColor }}
            >
              {predicted.formatted}
            </p>
            <p className="text-[9px] text-muted-foreground/30 mt-1 uppercase tracking-wider">
              {predicted.confidence} confidence · {predicted.basis}
            </p>
          </div>
        )}
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2.5 mb-4">
        <MiniBar label="Sessions" value={readiness.breakdown.sessions} color={barColor(readiness.breakdown.sessions)} />
        <MiniBar label="Volume" value={readiness.breakdown.volume} color={barColor(readiness.breakdown.volume)} />
        <MiniBar label="Consistency" value={readiness.breakdown.consistency} color={barColor(readiness.breakdown.consistency)} />
        {hasRealRecovery && (
          <MiniBar label="Recovery" value={readiness.breakdown.recovery} color={barColor(readiness.breakdown.recovery, true)} />
        )}
      </div>

      {/* Insight */}
      <p className="text-[11px] text-muted-foreground/50 leading-snug flex items-start gap-1.5">
        <TrendingUp className="h-3 w-3 mt-0.5 shrink-0" style={{ color: readiness.color }} />
        {readiness.insight}
      </p>
    </div>
  );
}
