import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getMonday } from "@/lib/utils";
import { WeekRow, type WeekRowData, type WorkoutRowData } from "@/components/plan/WeekRow";
import { Trophy, Target, CalendarDays, Zap } from "lucide-react";
import Link from "next/link";

const KEY_SESSION_ORDER = ["RACE", "HYROX_SIM", "LONG_RUN", "INTERVALS", "TEMPO", "HYROX_STATION_WORK", "STRENGTH"];

const PHASE_COLORS: Record<string, string> = {
  Base:  "rgba(99,102,241,0.6)",
  Build: "rgba(249,115,22,0.6)",
  Peak:  "rgba(239,68,68,0.7)",
  Taper: "rgba(234,179,8,0.6)",
  Race:  "rgba(255,255,255,0.8)",
};

export default async function PlanPage({ params }: { params: { planId: string } }) {
  const session = await auth();
  const userId = session!.user!.id as string;

  const plan = await db.trainingPlan.findUnique({
    where: { id: params.planId },
    include: {
      event: true,
      workouts: { orderBy: { scheduledDate: "asc" } },
    },
  });

  if (!plan || plan.userId !== userId) notFound();

  const isHyrox = plan.event.type.startsWith("HYROX");
  const accentColor = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";

  // Parse weeklyStructure for phase and template mileage per week
  type WeekMeta = { week: number; phase: string; totalMi: number };
  const weekMeta = (plan.weeklyStructure as WeekMeta[]) ?? [];
  const phaseByWeek = new Map(weekMeta.map(w => [w.week, w.phase]));

  // Determine plan start from first workout
  const sorted = [...plan.workouts].sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  const planStart = sorted.length > 0 ? getMonday(sorted[0].scheduledDate) : new Date();

  const now = new Date();

  // Group workouts by derived week number
  const weekMap = new Map<number, WorkoutRowData[]>();
  for (const w of plan.workouts) {
    const daysDiff = Math.floor(
      (getMonday(w.scheduledDate).getTime() - planStart.getTime()) / 86400000
    );
    const weekNum = Math.max(1, Math.floor(daysDiff / 7) + 1);
    const dayOfWeek = (w.scheduledDate.getDay() + 6) % 7; // Sun=0 → convert to Mon=0

    if (!weekMap.has(weekNum)) weekMap.set(weekNum, []);
    weekMap.get(weekNum)!.push({
      id: w.id,
      type: w.type,
      title: w.title,
      description: w.description,
      targetDistance: w.targetDistance,
      targetDuration: w.targetDuration,
      targetPace: w.targetPace,
      status: w.status,
      dayOfWeek,
    });
  }

  // Build WeekRowData[]
  const weeks: WeekRowData[] = Array.from({ length: plan.totalWeeks }, (_, i) => {
    const weekNum = i + 1;
    const workouts = weekMap.get(weekNum) ?? [];
    const nonRest = workouts.filter(w => w.type !== "REST");
    const completed = workouts.filter(w => w.status === "COMPLETED").length;

    const weekStart = new Date(planStart.getTime() + i * 7 * 86400000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const isCurrent = now >= weekStart && now < weekEnd;
    const isPast = weekEnd <= now;

    const totalMiles = Math.round(
      workouts.reduce((s, w) => s + (w.targetDistance ?? 0), 0) * 10
    ) / 10;

    const keySession = KEY_SESSION_ORDER.reduce<WorkoutRowData | null>(
      (found, type) => found ?? workouts.find(w => w.type === type) ?? null,
      null
    );

    return {
      weekNumber: weekNum,
      phase: phaseByWeek.get(weekNum) ?? "Base",
      totalMiles,
      workouts,
      completedCount: completed,
      nonRestCount: nonRest.length,
      isCurrentWeek: isCurrent,
      isPast,
      keySession,
      accentColor,
    };
  });

  // Summary stats
  const totalPlannedMiles = Math.round(weeks.reduce((s, w) => s + w.totalMiles, 0));
  const completedMiles = Math.round(
    plan.workouts
      .filter(w => w.status === "COMPLETED")
      .reduce((s, w) => s + (w.targetDistance ?? 0), 0)
  );
  const totalNonRest = weeks.reduce((s, w) => s + w.nonRestCount, 0);
  const totalCompleted = weeks.reduce((s, w) => s + w.completedCount, 0);
  const completionPct = totalNonRest > 0 ? Math.round((totalCompleted / totalNonRest) * 100) : 0;
  const currentWeekIndex = weeks.findIndex(w => w.isCurrentWeek);
  const currentPhase = currentWeekIndex >= 0 ? weeks[currentWeekIndex].phase : weeks[0]?.phase ?? "Base";

  // Phase timeline: group consecutive same-phase weeks
  const phaseSegments: { phase: string; count: number; startsAtCurrentWeek: boolean }[] = [];
  for (const w of weeks) {
    const last = phaseSegments[phaseSegments.length - 1];
    if (last && last.phase === w.phase) {
      last.count++;
      if (w.isCurrentWeek) last.startsAtCurrentWeek = true;
    } else {
      phaseSegments.push({ phase: w.phase, count: 1, startsAtCurrentWeek: w.isCurrentWeek });
    }
  }

  // Days to event
  const daysOut = Math.ceil((plan.event.date.getTime() - now.getTime()) / 86400000);

  const TEMPLATE_LABELS: Record<string, string> = {
    HAL_HIGDON_NOVICE: "Hal Higdon Novice",
    HAL_HIGDON_INTERMEDIATE: "Hal Higdon Intermediate",
    HAL_HIGDON_ADVANCED: "Hal Higdon Advanced",
    HYROX_8WK: "HYROX 8-Week",
    HYROX_16WK: "HYROX 16-Week",
  };

  // Group weeks by phase for section headers
  const phaseSections: { phase: string; weeks: WeekRowData[] }[] = [];
  for (const w of weeks) {
    const last = phaseSections[phaseSections.length - 1];
    if (last && last.phase === w.phase) {
      last.weeks.push(w);
    } else {
      phaseSections.push({ phase: w.phase, weeks: [w] });
    }
  }

  return (
    <div className="max-w-4xl space-y-10">

      {/* Back link */}
      <Link href="/events" className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
        ← Events
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-2">
            Training Plan
          </p>
          <h1 className="text-[2.5rem] font-black tracking-tight leading-none">{plan.event.name}</h1>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {plan.event.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
            {plan.event.goalTime && (
              <span className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: accentColor }}>
                <Target className="h-3.5 w-3.5" />
                Goal: {plan.event.goalTime}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground/50">
              {TEMPLATE_LABELS[plan.templateBase] ?? plan.templateBase}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[3.5rem] font-black tabular-nums leading-none" style={{ color: accentColor }}>
            {daysOut}
          </p>
          <p className="text-[9px] font-semibold tracking-[0.18em] text-muted-foreground/30 uppercase mt-1">days out</p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Weeks", value: `${plan.currentWeek} / ${plan.totalWeeks}`, sub: "current" },
          { label: "Miles logged", value: `${completedMiles}`, sub: `of ${totalPlannedMiles} planned` },
          { label: "Completion", value: completionPct > 0 ? `${completionPct}%` : "—", sub: `${totalCompleted} / ${totalNonRest} sessions` },
          { label: "Phase", value: currentPhase, sub: "current" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl bg-card p-4">
            <p className="text-[9px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-1.5">{stat.label}</p>
            <p className="text-[1.4rem] font-black leading-none tabular-nums"
              style={stat.label === "Phase" ? { color: PHASE_COLORS[stat.value] ?? accentColor, fontSize: "1rem" } : undefined}>
              {stat.value}
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Phase timeline strip */}
      <div>
        <p className="text-[9px] font-semibold tracking-[0.22em] text-muted-foreground/30 uppercase mb-2">Plan Arc</p>
        <div className="flex h-6 rounded-full overflow-hidden gap-px">
          {phaseSegments.map((seg, i) => (
            <div
              key={i}
              className="flex items-center justify-center relative"
              style={{
                flex: seg.count,
                background: PHASE_COLORS[seg.phase] ?? "rgba(255,255,255,0.2)",
                opacity: seg.phase === currentPhase ? 1 : 0.45,
              }}
            >
              {seg.count >= 3 && (
                <span className="text-[8px] font-black uppercase tracking-wider text-black/70 select-none">
                  {seg.phase}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] text-muted-foreground/30">Week 1</span>
          <span className="text-[9px] text-muted-foreground/30">Week {plan.totalWeeks}</span>
        </div>
      </div>

      {/* Day-of-week column headers */}
      <div className="flex items-center gap-4 px-4">
        <div className="w-10" />
        <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
            <p key={d} className="text-center text-[9px] font-semibold tracking-wider uppercase"
              style={{ color: "rgba(255,255,255,0.2)" }}>
              {d}
            </p>
          ))}
        </div>
        <div className="w-14" />
        <div className="w-36 hidden md:block" />
        <div className="w-12" />
        <div className="w-3.5" />
      </div>

      {/* Week sections grouped by phase */}
      <div className="space-y-8">
        {phaseSections.map((section, si) => (
          <div key={si}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, ${PHASE_COLORS[section.phase] ?? accentColor}60, transparent)` }}
              />
              <span
                className="text-[10px] font-black uppercase tracking-[0.2em] shrink-0"
                style={{ color: PHASE_COLORS[section.phase] ?? accentColor }}
              >
                {section.phase}
              </span>
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to left, ${PHASE_COLORS[section.phase] ?? accentColor}60, transparent)` }}
              />
            </div>
            <div className="space-y-1.5">
              {section.weeks.map(week => (
                <WeekRow
                  key={week.weekNumber}
                  week={week}
                  defaultExpanded={week.isCurrentWeek}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Race week callout */}
      {daysOut <= 14 && (
        <div className="rounded-xl p-5 text-center"
          style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}40` }}>
          <Trophy className="h-6 w-6 mx-auto mb-2" style={{ color: accentColor }} />
          <p className="font-black text-[1.1rem]" style={{ color: accentColor }}>Race week.</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Trust the work. Taper, sleep, stay off your feet.
          </p>
        </div>
      )}

    </div>
  );
}
