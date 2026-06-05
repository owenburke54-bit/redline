function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function RingGauge({
  value,
  max,
  color,
  displayValue,
  label,
  isRecovery,
}: {
  value: number | null;
  max: number;
  color: string;
  displayValue: string;
  label: string;
  isRecovery?: boolean;
}) {
  const size = 108;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = value != null ? Math.min(Math.max(value / max, 0), 1) : 0;
  const filled = pct * circumference;
  const cx = size / 2;
  const cy = size / 2;

  // Compute drop-shadow for recovery ring based on color tier
  let dropShadow = "";
  if (isRecovery && value != null) {
    if (value >= 67) {
      dropShadow = "drop-shadow(0 0 8px rgba(0,232,122,0.4))";
    } else if (value >= 34) {
      dropShadow = "drop-shadow(0 0 8px rgba(255,184,0,0.3))";
    } else {
      dropShadow = "drop-shadow(0 0 8px rgba(255,45,45,0.3))";
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          filter: dropShadow || undefined,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
          />
          {value != null && value > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - filled}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                "--ring-full": circumference,
                "--ring-value": circumference - filled,
              } as React.CSSProperties}
              className="animate-ring-draw"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-black tabular-nums text-[1.25rem] leading-none"
            style={{ color: value != null ? color : "rgba(255,255,255,0.2)" }}
          >
            {displayValue}
          </span>
        </div>
      </div>
      <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground/50">
        {label}
      </p>
    </div>
  );
}

interface WhoopRingsProps {
  recoveryScore: number | null;
  strain: number | null;
  sleepScore: number | null;
  sleepDuration: number | null;
  hrvRmssd: number | null;
  restingHr: number | null;
  impactText: string;
  staleLabel: string | null;
  recentActivities: { sportName: string; startDate: Date; strain: number }[];
}

export function WhoopRings({
  recoveryScore,
  strain,
  sleepScore,
  sleepDuration,
  hrvRmssd,
  restingHr,
  impactText,
  staleLabel,
  recentActivities,
}: WhoopRingsProps) {
  // WHOOP official thresholds: green ≥67%, yellow 34–66%, red <34%
  const rColor =
    recoveryScore == null
      ? "rgba(255,255,255,0.2)"
      : recoveryScore >= 67
      ? "#00E87A"
      : recoveryScore >= 34
      ? "#FFB800"
      : "#FF2D2D";

  const strainColor = "#4A9EFF"; // WHOOP uses blue for strain

  const sleepColor =
    sleepScore == null
      ? "#00E87A"
      : sleepScore >= 70
      ? "#00E87A"
      : sleepScore >= 50
      ? "#FFB800"
      : "#FF2D2D";

  return (
    <>
      {staleLabel && (
        <p className="text-[10px] text-amber-400/70 mb-3">{staleLabel}</p>
      )}

      <div className="flex flex-wrap items-start gap-6 sm:gap-8">
        {/* Strain ring */}
        <RingGauge
          value={strain}
          max={21}
          color={strainColor}
          displayValue={strain != null ? strain.toFixed(1) : "—"}
          label="Strain"
        />

        {/* Recovery ring */}
        <RingGauge
          value={recoveryScore}
          max={100}
          color={rColor}
          displayValue={recoveryScore != null ? `${Math.round(recoveryScore)}%` : "—"}
          label="Recovery"
          isRecovery
        />

        {/* Divider — desktop only */}
        {(sleepScore != null || sleepDuration != null || hrvRmssd != null || restingHr != null) && (
          <div className="self-stretch w-px bg-border/30 hidden sm:block my-2" />
        )}

        {/* Sleep stats */}
        {(sleepScore != null || sleepDuration != null) && (
          <div className="flex flex-col gap-3 pt-1">
            {sleepScore != null && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/40 mb-0.5">
                  Sleep Performance
                </p>
                <p className="text-[1.5rem] font-black tabular-nums leading-none" style={{ color: sleepColor }}>
                  {Math.round(sleepScore)}%
                </p>
              </div>
            )}
            {sleepDuration != null && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/40 mb-0.5">
                  Hours of Sleep
                </p>
                <p className="text-[1.3rem] font-black tabular-nums leading-none text-foreground">
                  {formatSleepDuration(sleepDuration)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* HRV + RHR */}
        {(hrvRmssd != null || restingHr != null) && (
          <div className="flex flex-col gap-3 pt-1">
            {hrvRmssd != null && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/40 mb-0.5">HRV</p>
                <p className="text-[1.3rem] font-black tabular-nums leading-none text-foreground">
                  {Math.round(hrvRmssd)}ms
                </p>
              </div>
            )}
            {restingHr != null && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/40 mb-0.5">RHR</p>
                <p className="text-[1.3rem] font-black tabular-nums leading-none text-foreground">
                  {Math.round(restingHr)}bpm
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Training impact */}
      <p className="text-[11px] text-muted-foreground leading-relaxed mt-5">{impactText}</p>

      {/* Recent other-sport activities */}
      {recentActivities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
          {recentActivities.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-white/5 text-muted-foreground"
            >
              {a.sportName}
              <span className="text-muted-foreground/50">
                {a.startDate.toLocaleDateString("en-US", { weekday: "short" })} ·{" "}
                {a.strain.toFixed(1)} strain
              </span>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
