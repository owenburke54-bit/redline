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
}: {
  value: number | null;
  max: number;
  color: string;
  displayValue: string;
  label: string;
}) {
  const size = 108;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = value != null ? Math.min(Math.max(value / max, 0), 1) : 0;
  const filled = pct * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
          {value != null && value > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${filled} ${circumference - filled}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
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
      <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground/50">{label}</p>
    </div>
  );
}

interface GarminRingsProps {
  bodyBattery: number | null;
  sleepScore: number | null;
  sleepDuration: number | null;
  restingHr: number | null;
  sleepHrv: number | null;
  stressAvg: number | null;
  impactText: string;
  staleLabel: string | null;
}

export function GarminRings({
  bodyBattery,
  sleepScore,
  sleepDuration,
  restingHr,
  sleepHrv,
  stressAvg,
  impactText,
  staleLabel,
}: GarminRingsProps) {
  const batteryColor =
    bodyBattery == null
      ? "rgba(255,255,255,0.2)"
      : bodyBattery >= 70
      ? "#22c55e"
      : bodyBattery >= 40
      ? "#f59e0b"
      : "#ef4444";

  const sleepColor =
    sleepScore == null
      ? "#22c55e"
      : sleepScore >= 70
      ? "#22c55e"
      : sleepScore >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <>
      {staleLabel && <p className="text-[10px] text-amber-400/70 mb-3">{staleLabel}</p>}

      <div className="flex flex-wrap items-start gap-6 sm:gap-8">
        {/* Body Battery ring */}
        <RingGauge
          value={bodyBattery}
          max={100}
          color={batteryColor}
          displayValue={bodyBattery != null ? `${Math.round(bodyBattery)}%` : "—"}
          label="Battery"
        />

        {/* Sleep ring */}
        <RingGauge
          value={sleepScore}
          max={100}
          color={sleepColor}
          displayValue={sleepScore != null ? `${Math.round(sleepScore)}` : "—"}
          label="Sleep"
        />

        {/* Divider */}
        {(sleepDuration != null || restingHr != null || sleepHrv != null || stressAvg != null) && (
          <div className="self-stretch w-px bg-border/30 hidden sm:block my-2" />
        )}

        {/* Sleep + RHR stats */}
        {(sleepDuration != null || restingHr != null) && (
          <div className="flex flex-col gap-3 pt-1">
            {sleepDuration != null && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/40 mb-0.5">
                  Sleep Time
                </p>
                <p className="text-[1.1rem] font-black tabular-nums leading-none text-foreground">
                  {formatSleepDuration(sleepDuration)}
                </p>
              </div>
            )}
            {restingHr != null && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/40 mb-0.5">RHR</p>
                <p className="text-[1.1rem] font-black tabular-nums leading-none text-foreground">
                  {restingHr}bpm
                </p>
              </div>
            )}
          </div>
        )}

        {/* HRV + Stress */}
        {(sleepHrv != null || stressAvg != null) && (
          <div className="flex flex-col gap-3 pt-1">
            {sleepHrv != null && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/40 mb-0.5">HRV</p>
                <p className="text-[1.1rem] font-black tabular-nums leading-none text-foreground">
                  {Math.round(sleepHrv)}ms
                </p>
              </div>
            )}
            {stressAvg != null && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground/40 mb-0.5">Stress</p>
                <p className="text-[1.1rem] font-black tabular-nums leading-none text-foreground">
                  {Math.round(stressAvg)}/100
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed mt-5">{impactText}</p>
    </>
  );
}
