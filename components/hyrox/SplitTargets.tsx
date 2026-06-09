"use client";

import {
  HYROX_STATION_ORDER,
  HYROX_STATION_EMOJI,
  TARGET_SPLITS_115,
  TARGET_RUN_SPLIT_115,
  TARGET_TOTAL_115,
  type HyroxStation,
} from "@/lib/hyrox/constants";
import type { StationReadiness } from "@/lib/hyrox/computeHyroxReadiness";

interface Props {
  stationReadiness: Record<HyroxStation, StationReadiness>;
  projectedTotalSecs?: number | null;
}

function secsToMMSS(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function estimatedSecs(targetSecs: number, score: number): number {
  // score 100 → exactly target; score 0 → 2× target
  return Math.round(targetSecs * (1 + (100 - score) / 100));
}

function gapColor(gapSecs: number): string {
  if (gapSecs <= 0) return "#00E87A";
  if (gapSecs <= 30) return "#FFB800";
  return "#FF2D2D";
}

function scoreColor(score: number): string {
  if (score >= 75) return "#00E87A";
  if (score >= 50) return "#FFB800";
  return "#FF2D2D";
}

export function SplitTargets({ stationReadiness, projectedTotalSecs }: Props) {
  const rows = HYROX_STATION_ORDER.map(station => {
    const target = TARGET_SPLITS_115[station];
    const score = stationReadiness[station].score;
    const estimated = estimatedSecs(target.seconds, score);
    const gap = estimated - target.seconds;
    return { station, target, score, estimated, gap };
  });

  const totalTargetSecs = TARGET_TOTAL_115;
  const totalEstimated = projectedTotalSecs ?? rows.reduce((s, r) => s + r.estimated, 0) + TARGET_RUN_SPLIT_115.seconds * 8;
  const totalGap = totalEstimated - totalTargetSecs;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase">
          Split Targets
        </p>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          Goal: 1:15:00
        </span>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Header */}
        <div
          className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-2"
          style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>Station</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-right" style={{ color: "rgba(255,255,255,0.2)" }}>Target</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-right" style={{ color: "rgba(255,255,255,0.2)" }}>Est.</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-right" style={{ color: "rgba(255,255,255,0.2)" }}>Gap</span>
        </div>

        {/* Rows */}
        {rows.map(({ station, target, score, estimated, gap }) => (
          <div
            key={station}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-3 py-2.5 border-b last:border-0"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">{HYROX_STATION_EMOJI[station]}</span>
              <span
                className="text-[11px] font-medium truncate"
                style={{ color: scoreColor(score) === "#00E87A" ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.9)" }}
              >
                {stationReadiness[station].label}
              </span>
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-right" style={{ color: "rgba(255,255,255,0.35)" }}>
              {target.label}
            </span>
            <span className="text-[11px] font-bold tabular-nums text-right" style={{ color: scoreColor(score) }}>
              {secsToMMSS(estimated)}
            </span>
            <span
              className="text-[11px] font-bold tabular-nums text-right"
              style={{ color: gapColor(gap) }}
            >
              {gap > 0 ? `+${secsToMMSS(gap)}` : gap === 0 ? "—" : `-${secsToMMSS(-gap)}`}
            </span>
          </div>
        ))}

        {/* Total row */}
        <div
          className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-3 py-2.5 mt-0"
          style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
            Total
          </span>
          <span className="text-[11px] font-bold tabular-nums text-right" style={{ color: "rgba(255,255,255,0.35)" }}>
            1:15:00
          </span>
          <span
            className="text-[11px] font-black tabular-nums text-right"
            style={{ color: gapColor(totalGap) }}
          >
            {Math.floor(totalEstimated / 3600)}:{String(Math.floor((totalEstimated % 3600) / 60)).padStart(2, "0")}:{String(Math.round(totalEstimated % 60)).padStart(2, "0")}
          </span>
          <span
            className="text-[11px] font-black tabular-nums text-right"
            style={{ color: gapColor(totalGap) }}
          >
            {totalGap > 0
              ? `+${secsToMMSS(totalGap)}`
              : totalGap === 0
              ? "—"
              : `-${secsToMMSS(-totalGap)}`}
          </span>
        </div>
      </div>

      <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.15)" }}>
        Est. based on readiness score · improves as you train
      </p>
    </div>
  );
}
