"use client";

const PHASE_COLORS: Record<string, string> = {
  Base:  "rgba(99,102,241,0.6)",
  Build: "rgba(249,115,22,0.6)",
  Peak:  "rgba(239,68,68,0.7)",
  Taper: "rgba(234,179,8,0.6)",
  Race:  "rgba(255,255,255,0.8)",
};

interface PhaseSegment {
  phase: string;
  count: number;
  startsAtCurrentWeek: boolean;
  isPastPhase: boolean;
  isFuturePhase: boolean;
}

interface PlanArcBarProps {
  phaseSegments: PhaseSegment[];
  currentPhase: string;
  accentColor: string;
  totalWeeks: number;
}

export function PlanArcBar({ phaseSegments, currentPhase, accentColor, totalWeeks }: PlanArcBarProps) {
  function handlePhaseClick(phase: string) {
    document.getElementById(`phase-${phase}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const phaseColor = PHASE_COLORS[currentPhase] ?? accentColor;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] font-semibold tracking-[0.22em] text-muted-foreground/30 uppercase">Plan Arc</p>
        <p className="text-[10px] font-bold" style={{ color: phaseColor }}>
          {currentPhase} phase
        </p>
      </div>
      <div className="flex h-6 rounded-full overflow-hidden gap-px">
        {phaseSegments.map((seg, i) => {
          let opacity = 0.5;
          let extraStyle: React.CSSProperties = {};

          if (seg.isPastPhase) {
            opacity = 0.3;
            extraStyle = { filter: "saturate(0.4)" };
          } else if (seg.phase === currentPhase) {
            opacity = 1;
            extraStyle = { outline: "2px solid rgba(255,255,255,0.3)", outlineOffset: "-2px" };
          }
          // future phase: opacity 0.5 (default)

          return (
            <button
              key={i}
              type="button"
              className="flex items-center justify-center relative focus:outline-none"
              style={{
                flex: seg.count,
                background: PHASE_COLORS[seg.phase] ?? "rgba(255,255,255,0.2)",
                opacity,
                cursor: "pointer",
                ...extraStyle,
              }}
              onClick={() => handlePhaseClick(seg.phase)}
              title={seg.phase}
            >
              {seg.count >= 3 ? (
                <span className="text-[8px] font-black uppercase tracking-wider text-black/60 select-none">
                  {seg.phase}
                </span>
              ) : seg.count >= 2 ? (
                <span className="text-[8px] font-black text-black/50 select-none">
                  {seg.phase[0]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-muted-foreground/30">Week 1</span>
        <span className="text-[9px] text-muted-foreground/30">Week {totalWeeks}</span>
      </div>
    </div>
  );
}
