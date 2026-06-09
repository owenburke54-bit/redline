"use client";

import { cn } from "@/lib/utils";
import {
  HYROX_STATION_ORDER,
  HYROX_STATION_LABELS,
  SPLITTABLE_STATIONS,
  type HyroxStation,
} from "@/lib/hyrox/constants";
import { STATION_ICON } from "./stationIcons";
import type { PartnerStrategy, StationAssignment } from "@/lib/hyrox/computeHyroxReadiness";

interface Props {
  strategy: PartnerStrategy;
}

const ASSIGNMENT_CONFIG: Record<
  StationAssignment["assignment"],
  { label: string; color: string; bg: string }
> = {
  OWEN:           { label: "Owen",    color: "#4A9EFF", bg: "rgba(74,158,255,0.12)" },
  VICTORIA:       { label: "Victoria",color: "#FF5500", bg: "rgba(255,85,0,0.12)" },
  SPLIT_EVEN:     { label: "50/50",   color: "#00E87A", bg: "rgba(0,232,122,0.10)" },
  SPLIT_DOMINANT: { label: "Split",   color: "#FFB800", bg: "rgba(255,184,0,0.10)" },
};

function vsLabel(delta: number): { text: string; color: string } {
  const abs = Math.abs(delta);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const formatted = `${m}:${s.toString().padStart(2, "0")}`;
  if (delta <= 0) return { text: `${formatted} under target`, color: "#00E87A" };
  return { text: `${formatted} over target`, color: "#FF2D2D" };
}

function AssignmentRow({ row }: { row: StationAssignment }) {
  const cfg = ASSIGNMENT_CONFIG[row.assignment];
  const isSplittable = SPLITTABLE_STATIONS.includes(row.station);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      {(() => { const Icon = STATION_ICON[row.station as HyroxStation]; return <Icon className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />; })()}
      <p className="flex-1 text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
        {HYROX_STATION_LABELS[row.station]}
      </p>
      {row.assignment === "SPLIT_EVEN" || row.assignment === "SPLIT_DOMINANT" ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(74,158,255,0.15)", color: "#4A9EFF" }}>
            {row.owenPortion}
          </span>
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(255,85,0,0.15)", color: "#FF5500" }}>
            {row.victoriaPortion}
          </span>
        </div>
      ) : (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      )}
    </div>
  );
}

export function PartnerStrategyCard({ strategy }: Props) {
  if (strategy.status === "WAITING_FOR_PARTNER") {
    return (
      <div>
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-3">
          Partner Strategy
        </p>
        <div
          className="rounded-xl p-5 flex flex-col items-center text-center gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(74,158,255,0.15)", color: "#4A9EFF" }}>O</div>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>+</span>
            <div className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(255,85,0,0.08)", color: "rgba(255,85,0,0.4)" }}>V</div>
          </div>
          <p className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
            Waiting for Victoria
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
            {strategy.message}
          </p>
          <div
            className="mt-1 px-4 py-2 rounded-lg text-[11px] font-semibold cursor-default"
            style={{ background: "rgba(255,85,0,0.10)", color: "rgba(255,85,0,0.6)" }}
          >
            Invite Victoria →
          </div>
        </div>
      </div>
    );
  }

  const vs = strategy.vsTargetDelta != null ? vsLabel(strategy.vsTargetDelta) : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase">
          Partner Strategy
        </p>
        {strategy.predictedTimeLabel && (
          <div className="text-right">
            <span className="text-[13px] font-black tabular-nums" style={{ color: vs && strategy.vsTargetDelta! <= 0 ? "#00E87A" : "#FFB800" }}>
              {strategy.predictedTimeLabel}
            </span>
            {vs && (
              <span className="ml-1.5 text-[10px] font-semibold" style={{ color: vs.color }}>
                {vs.text}
              </span>
            )}
          </div>
        )}
      </div>

      {strategy.message && (
        <div
          className="rounded-lg px-3 py-2 mb-3 text-[11px]"
          style={{
            background: strategy.vsTargetDelta != null && strategy.vsTargetDelta <= 0
              ? "rgba(0,232,122,0.06)"
              : "rgba(255,184,0,0.06)",
            color: strategy.vsTargetDelta != null && strategy.vsTargetDelta <= 0
              ? "rgba(0,232,122,0.8)"
              : "rgba(255,184,0,0.8)",
          }}
        >
          {strategy.message}
        </div>
      )}

      <div
        className="rounded-xl px-3 pt-1 pb-1"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center justify-between px-0 py-2 mb-0.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>Station</span>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#4A9EFF", opacity: 0.6 }}>Owen</span>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#FF5500", opacity: 0.6 }}>Victoria</span>
          </div>
        </div>
        {strategy.assignments?.map(row => (
          <AssignmentRow key={row.station} row={row} />
        ))}
      </div>
    </div>
  );
}
