"use client";

import {
  HYROX_STATION_ORDER,
  STATION_TRAINING_TIPS,
  type HyroxStation,
} from "@/lib/hyrox/constants";
import { STATION_ICON } from "./stationIcons";
import type { StationReadiness } from "@/lib/hyrox/computeHyroxReadiness";

interface Props {
  stationReadiness: Record<HyroxStation, StationReadiness>;
}

const PRIORITY_LABELS = ["#1 Priority", "#2 Priority", "#3 Focus"] as const;
const PRIORITY_COLORS = ["#FF2D2D", "#FFB800", "#4A9EFF"] as const;

function scoreColor(score: number): string {
  if (score >= 75) return "#00E87A";
  if (score >= 50) return "#FFB800";
  return "#FF2D2D";
}

export function WeaknessRadar({ stationReadiness }: Props) {
  const ranked = [...HYROX_STATION_ORDER]
    .map(st => ({ station: st, data: stationReadiness[st] }))
    .sort((a, b) => a.data.score - b.data.score)
    .slice(0, 3);

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-3">
        Priority Focus Areas
      </p>
      <div className="space-y-2.5">
        {ranked.map(({ station, data }, i) => {
          const priorityColor = PRIORITY_COLORS[i];
          const tip = STATION_TRAINING_TIPS[station][0];

          return (
            <div
              key={station}
              className="rounded-xl p-3.5"
              style={{
                background: `rgba(${i === 0 ? "255,45,45" : i === 1 ? "255,184,0" : "74,158,255"},0.05)`,
                border: `1px solid ${priorityColor}20`,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  {(() => { const Icon = STATION_ICON[station]; return <Icon className="h-5 w-5 shrink-0" style={{ color: priorityColor }} />; })()}
                  <div>
                    <p className="text-[12px] font-bold leading-tight" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {data.label}
                    </p>
                    <span
                      className="text-[9px] font-black uppercase tracking-wider"
                      style={{ color: priorityColor }}
                    >
                      {PRIORITY_LABELS[i]}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[1.6rem] font-black leading-none tabular-nums" style={{ color: scoreColor(data.score) }}>
                    {data.score}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>
                    /100
                  </p>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-0.5 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${data.score}%`, background: scoreColor(data.score) }}
                />
              </div>

              {/* Recommended action */}
              <div className="flex items-start gap-2">
                <span className="text-[10px] mt-0.5 shrink-0" style={{ color: priorityColor }}>→</span>
                <p className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {tip}
                </p>
              </div>

              {data.practiceCount > 0 && (
                <p className="mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {data.practiceCount} session{data.practiceCount !== 1 ? "s" : ""} logged
                  {data.avgRpe != null && ` · avg RPE ${data.avgRpe.toFixed(1)}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
