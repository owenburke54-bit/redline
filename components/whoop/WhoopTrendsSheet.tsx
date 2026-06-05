"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface RecoveryDay {
  date: string;
  recoveryScore: number;
  sleepScore: number | null;
  sleepDuration: number | null;
  hrv: number | null;
  restingHr: number | null;
}

interface StrainDay {
  date: string;
  strain: number;
}

interface TrendsData {
  recovery: RecoveryDay[];
  strain: StrainDay[];
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
}

function recoveryColor(score: number) {
  if (score >= 67) return "#00E87A";
  if (score >= 34) return "#FFB800";
  return "#FF2D2D";
}

// ─── Sparkline with scale, value labels, and tap highlight ───────────────────

function SparkChart({
  values,
  labels,
  color,
  unit,
  formatValue,
  scaleMin,
  scaleMax,
  height = 64,
}: {
  values: number[];
  labels: string[];
  color: string | ((v: number) => string);
  unit: string;
  formatValue?: (v: number) => string;
  scaleMin?: number;
  scaleMax?: number;
  height?: number;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (values.length === 0) return null;

  const fmt = formatValue ?? ((v: number) => String(Math.round(v)));
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const chartMin = scaleMin ?? Math.max(0, dataMin - (dataMax - dataMin) * 0.3);
  const chartMax = scaleMax ?? dataMax + (dataMax - dataMin) * 0.2;
  const range = chartMax - chartMin || 1;

  const W = 100; // viewBox units wide
  const pad = 2;
  const stepX = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;

  function yPos(v: number) {
    return height - pad - ((v - chartMin) / range) * (height - pad * 2);
  }

  const points = values.map((v, i) => ({ x: pad + i * stepX, y: yPos(v) }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const fillD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  const midVal = (chartMin + chartMax) / 2;

  // Color of the last point (or active point)
  function pointColor(idx: number) {
    const c = color;
    if (typeof c === "function") return c(values[idx]);
    return c;
  }
  const activeColor = pointColor(activeIdx ?? values.length - 1);

  return (
    <div>
      <div className="flex gap-2">
        {/* Y-axis scale */}
        <div className="flex flex-col justify-between shrink-0 text-right" style={{ width: 28, height }}>
          <span className="text-[9px] tabular-nums leading-none" style={{ color: "rgba(255,255,255,0.3)" }}>
            {fmt(chartMax)}{unit}
          </span>
          <span className="text-[9px] tabular-nums leading-none" style={{ color: "rgba(255,255,255,0.18)" }}>
            {fmt(midVal)}{unit}
          </span>
          <span className="text-[9px] tabular-nums leading-none" style={{ color: "rgba(255,255,255,0.18)" }}>
            {fmt(chartMin)}{unit}
          </span>
        </div>

        {/* Chart area */}
        <div className="flex-1 relative" style={{ height }}>
          <svg
            viewBox={`0 0 ${W} ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id={`g-${activeColor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={activeColor} stopOpacity="0" />
              </linearGradient>
              {/* Grid lines */}
            </defs>

            {/* Horizontal grid lines */}
            {[chartMin, midVal, chartMax].map((v, i) => (
              <line
                key={i}
                x1={0} y1={yPos(v)} x2={W} y2={yPos(v)}
                stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"
              />
            ))}

            {/* Fill */}
            <path d={fillD} fill={`url(#g-${activeColor.replace("#", "")})`} />

            {/* Line */}
            <path d={pathD} stroke={activeColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data point dots — shown for active, and always for last point */}
            {points.map((p, i) => {
              const isActive = i === activeIdx;
              const isLast = i === values.length - 1 && activeIdx === null;
              if (!isActive && !isLast) return null;
              const c = pointColor(i);
              return (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="3.5" fill={c} />
                  <circle cx={p.x} cy={p.y} r="5.5" fill={c} fillOpacity="0.2" />
                </g>
              );
            })}

            {/* Invisible tap targets */}
            {points.map((p, i) => (
              <rect
                key={i}
                x={p.x - stepX / 2}
                y={0}
                width={stepX}
                height={height}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                onClick={() => setActiveIdx(activeIdx === i ? null : i)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Day labels + values row */}
      <div className="flex mt-2" style={{ marginLeft: 36 }}>
        {labels.map((l, i) => {
          const isActive = i === activeIdx;
          const c = pointColor(i);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-0.5"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={() => setActiveIdx(activeIdx === i ? null : i)}
            >
              <span
                className="text-[10px] tabular-nums font-semibold"
                style={{ color: isActive ? c : "rgba(255,255,255,0.45)" }}
              >
                {fmt(values[i])}{unit}
              </span>
              <span
                className="text-[9px] font-medium"
                style={{ color: isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.22)" }}
              >
                {l}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function TrendCard({
  label,
  values,
  labels,
  color,
  unit,
  formatValue,
  scaleMin,
  scaleMax,
}: {
  label: string;
  values: number[];
  labels: string[];
  color: string | ((v: number) => string);
  unit: string;
  formatValue?: (v: number) => string;
  scaleMin?: number;
  scaleMax?: number;
}) {
  if (values.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">{label}</p>
        <p className="text-[11px] text-muted-foreground/25">No data this week</p>
      </div>
    );
  }

  const fmt = formatValue ?? ((v: number) => String(Math.round(v)));
  const latest = values[values.length - 1];
  const latestColor = typeof color === "function" ? color(latest) : color;

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">{label}</p>
        <div className="text-right">
          <span className="text-[1.3rem] font-black leading-none tabular-nums" style={{ color: latestColor }}>
            {fmt(latest)}
          </span>
          <span className="text-[10px] text-muted-foreground/40 ml-0.5">{unit}</span>
          <p className="text-[9px] text-muted-foreground/25 mt-0.5">today</p>
        </div>
      </div>
      <SparkChart
        values={values}
        labels={labels}
        color={color}
        unit={unit}
        formatValue={formatValue}
        scaleMin={scaleMin}
        scaleMax={scaleMax}
        height={56}
      />
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function WhoopTrendsSheet({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/whoop/trends")
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));

    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) window.scrollTo(0, parseInt(top) * -1);
    };
  }, []);

  const recoveryDays = data?.recovery ?? [];
  const recoveryValues = recoveryDays.map(r => r.recoveryScore);
  const recoveryLabels = recoveryDays.map(r => dayLabel(r.date));

  const sleepDays = recoveryDays.filter(r => r.sleepScore != null);
  const sleepValues = sleepDays.map(r => r.sleepScore as number);
  const sleepLabels = sleepDays.map(r => dayLabel(r.date));

  const strainDays = data?.strain ?? [];
  const strainValues = strainDays.map(s => s.strain);
  const strainLabels = strainDays.map(s => dayLabel(s.date));

  const hrvDays = recoveryDays.filter(r => r.hrv != null);
  const hrvValues = hrvDays.map(r => r.hrv as number);
  const hrvLabels = hrvDays.map(r => dayLabel(r.date));

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{
          background: "var(--color-bg-surface, #111111)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
          maxHeight: "88vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40">WHOOP</p>
            <p className="text-[16px] font-black">7-Day Trends</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Charts */}
        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl h-32 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : (
            <>
              <TrendCard
                label="Recovery"
                values={recoveryValues}
                labels={recoveryLabels}
                color={recoveryColor}
                unit="%"
                scaleMin={0}
                scaleMax={100}
              />
              <TrendCard
                label="Strain"
                values={strainValues}
                labels={strainLabels}
                color="#4A9EFF"
                unit=""
                formatValue={v => v.toFixed(1)}
                scaleMin={0}
                scaleMax={21}
              />
              <TrendCard
                label="Sleep Performance"
                values={sleepValues}
                labels={sleepLabels}
                color="#A855F7"
                unit="%"
                scaleMin={0}
                scaleMax={100}
              />
              {hrvValues.length > 0 && (
                <TrendCard
                  label="HRV"
                  values={hrvValues}
                  labels={hrvLabels}
                  color="#00E87A"
                  unit="ms"
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
