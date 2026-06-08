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
  ctl,
  atl,
  tsb,
}: {
  readiness: ReadinessResult;
  predicted: PredictedTime | null;
  accentColor: string;
  ctl?: number | null;
  atl?: number | null;
  tsb?: number | null;
}) {
  const hasRealRecovery = readiness.breakdown.recovery !== 65;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Top row: score + predicted side by side */}
      <div className="flex items-start gap-3 mb-4">
        {/* Score */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-1">
            Race Readiness
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[2.5rem] font-black leading-none tabular-nums"
              style={{ color: readiness.color }}
            >
              {readiness.score}
            </span>
            <span className="text-[13px] font-bold leading-none" style={{ color: readiness.color }}>
              {readiness.label}
            </span>
          </div>
        </div>

        {predicted && (
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-1">
              Predicted
            </p>
            <p
              className="text-[1.6rem] font-black leading-none tabular-nums"
              style={{ color: accentColor }}
            >
              {predicted.formatted}
            </p>
            <p className="text-[9px] text-muted-foreground/30 mt-0.5 leading-tight">
              {predicted.confidence} conf · {predicted.basis}
            </p>
          </div>
        )}
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2 mb-3">
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

      {/* CTL / ATL / TSB one-liner */}
      {ctl != null && (
        <div
          className="mt-3 pt-3 flex items-center gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/25">
            Load
          </span>
          <div className="flex items-center gap-3 text-[10px] tabular-nums">
            <span>
              <span style={{ color: "rgba(255,255,255,0.25)" }}>CTL </span>
              <span className="font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
                {ctl.toFixed(0)}
              </span>
            </span>
            {atl != null && (
              <span>
                <span style={{ color: "rgba(255,255,255,0.25)" }}>ATL </span>
                <span className="font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {atl.toFixed(0)}
                </span>
              </span>
            )}
            {tsb != null && (
              <span>
                <span style={{ color: "rgba(255,255,255,0.25)" }}>TSB </span>
                <span
                  className="font-bold"
                  style={{
                    color: tsb > 5 ? "#00E87A" : tsb < -25 ? "#FF2D2D" : "rgba(255,255,255,0.55)",
                  }}
                >
                  {tsb > 0 ? "+" : ""}
                  {tsb.toFixed(0)}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
