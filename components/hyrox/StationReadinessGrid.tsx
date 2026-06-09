"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TARGET_SPLITS_115, HYROX_STATION_ORDER, HYROX_STATION_EMOJI, type HyroxStation } from "@/lib/hyrox/constants";
import type { StationReadiness } from "@/lib/hyrox/computeHyroxReadiness";

interface Props {
  stationReadiness: Record<HyroxStation, StationReadiness>;
}

function scoreColor(score: number): string {
  if (score >= 75) return "#00E87A";
  if (score >= 50) return "#FFB800";
  return "#FF2D2D";
}

function scoreBg(score: number): string {
  if (score >= 75) return "rgba(0,232,122,0.08)";
  if (score >= 50) return "rgba(255,184,0,0.08)";
  return "rgba(255,45,45,0.08)";
}

function StationCard({ station, data }: { station: HyroxStation; data: StationReadiness }) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(data.score);
  const target = TARGET_SPLITS_115[station];
  const pct = data.score;

  return (
    <button
      className="rounded-xl p-3.5 text-left transition-all w-full"
      style={{ background: scoreBg(data.score), border: `1px solid ${color}25` }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-lg leading-none">{HYROX_STATION_EMOJI[station]}</span>
          <p className="text-[11px] font-semibold mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            {data.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[2rem] font-black leading-none tabular-nums" style={{ color }}>
            {data.score}
          </p>
          <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
            {data.confidence === "tracked" ? "tracked" : data.confidence === "estimated" ? "estimated" : "no data"}
          </p>
        </div>
      </div>

      {/* Progress arc */}
      <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t text-left" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              {data.practiceCount > 0
                ? `${data.practiceCount} session${data.practiceCount !== 1 ? "s" : ""} tracked`
                : "No sessions tracked yet"}
            </span>
            <span className="text-[10px] font-bold" style={{ color }}>
              Target: {target.label}
            </span>
          </div>
          {data.avgRpe != null && (
            <p className="text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              Avg RPE on station work: {data.avgRpe.toFixed(1)}/10
            </p>
          )}
          <p className="text-[10px] font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Training focus:
          </p>
          <ul className="space-y-1">
            {data.tips.map((tip, i) => (
              <li key={i} className="text-[10px] leading-snug pl-2.5 relative" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span className="absolute left-0" style={{ color }}>·</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </button>
  );
}

export function StationReadinessGrid({ stationReadiness }: Props) {
  const avgScore = Math.round(
    HYROX_STATION_ORDER.reduce((s, st) => s + stationReadiness[st].score, 0) / 8
  );

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase">
          Station Readiness
        </p>
        <span className="text-[11px] font-bold" style={{ color: scoreColor(avgScore) }}>
          Avg {avgScore}/100
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HYROX_STATION_ORDER.map(station => (
          <StationCard key={station} station={station} data={stationReadiness[station]} />
        ))}
      </div>
      <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
        Tap any station to see training tips and target split
      </p>
    </div>
  );
}
