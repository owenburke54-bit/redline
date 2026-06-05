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

function SparkLine({
  values,
  max,
  color,
  height = 48,
}: {
  values: number[];
  max: number;
  color: string | ((v: number) => string);
  height?: number;
}) {
  if (values.length < 2) return null;
  const w = 100 / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * w;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const lastColor = typeof color === "function" ? color(values[values.length - 1]) : color;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`grad-${lastColor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lastColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lastColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${(values.length - 1) * w},${height} L 0,${height} Z`}
        fill={`url(#grad-${lastColor.replace("#", "")})`}
      />
      <path d={pathD} stroke={lastColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {(() => {
        const last = values[values.length - 1];
        const x = (values.length - 1) * w;
        const y = height - (last / max) * (height - 4) - 2;
        return <circle cx={x} cy={y} r="2.5" fill={lastColor} />;
      })()}
    </svg>
  );
}

function TrendCard({
  label,
  values,
  labels,
  max,
  color,
  unit,
  formatValue,
}: {
  label: string;
  values: number[];
  labels: string[];
  max: number;
  color: string | ((v: number) => string);
  unit: string;
  formatValue?: (v: number) => string;
}) {
  if (values.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-1">{label}</p>
        <p className="text-[11px] text-muted-foreground/25">No data this week</p>
      </div>
    );
  }

  const latest = values[values.length - 1];
  const latestColor = typeof color === "function" ? color(latest) : color;
  const fmt = formatValue ?? ((v: number) => String(Math.round(v)));

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">{label}</p>
        <div className="text-right">
          <span className="text-[1.25rem] font-black leading-none tabular-nums" style={{ color: latestColor }}>
            {fmt(latest)}
          </span>
          <span className="text-[10px] text-muted-foreground/40 ml-0.5">{unit}</span>
        </div>
      </div>
      <SparkLine values={values} max={max} color={color} height={44} />
      <div className="flex justify-between mt-1">
        {labels.map((l, i) => (
          <span key={i} className="text-[9px] text-muted-foreground/25">{l}</span>
        ))}
      </div>
    </div>
  );
}

export function WhoopTrendsSheet({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/whoop/trends")
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));

    // Lock scroll
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

  const recoveryValues = (data?.recovery ?? []).map(r => r.recoveryScore);
  const recoveryLabels = (data?.recovery ?? []).map(r => dayLabel(r.date));
  const sleepValues = (data?.recovery ?? []).filter(r => r.sleepScore != null).map(r => r.sleepScore as number);
  const sleepLabels = (data?.recovery ?? []).filter(r => r.sleepScore != null).map(r => dayLabel(r.date));
  const strainValues = (data?.strain ?? []).map(s => s.strain);
  const strainLabels = (data?.strain ?? []).map(s => dayLabel(s.date));
  const hrvValues = (data?.recovery ?? []).filter(r => r.hrv != null).map(r => r.hrv as number);
  const hrvLabels = (data?.recovery ?? []).filter(r => r.hrv != null).map(r => dayLabel(r.date));

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{
          background: "var(--color-bg-surface, #111111)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "none",
          maxHeight: "85vh",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40">WHOOP</p>
            <p className="text-[16px] font-black">7-Day Trends</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl h-24 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : (
            <>
              <TrendCard
                label="Recovery"
                values={recoveryValues}
                labels={recoveryLabels}
                max={100}
                color={recoveryColor}
                unit="%"
              />
              <TrendCard
                label="Strain"
                values={strainValues}
                labels={strainLabels}
                max={21}
                color="#4A9EFF"
                unit=""
                formatValue={v => v.toFixed(1)}
              />
              <TrendCard
                label="Sleep Performance"
                values={sleepValues}
                labels={sleepLabels}
                max={100}
                color="#A855F7"
                unit="%"
              />
              {hrvValues.length > 0 && (
                <TrendCard
                  label="HRV"
                  values={hrvValues}
                  labels={hrvLabels}
                  max={Math.max(...hrvValues) * 1.2}
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
