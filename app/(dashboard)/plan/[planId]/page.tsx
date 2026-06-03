import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getMonday } from "@/lib/utils";
import { WeekRow, type WeekRowData, type WorkoutRowData } from "@/components/plan/WeekRow";
import type { WorkoutDetailData } from "@/components/plan/WorkoutDetailSheet";
import { ResolveConflictsButton } from "@/components/plan/ResolveConflictsButton";
import { PlanStatusToggle } from "@/components/plan/PlanStatusToggle";
import { RestoreTemplateButton } from "@/components/plan/RestoreTemplateButton";
import { PlanArcBar } from "@/components/plan/PlanArcBar";
import { Trophy, Target, CalendarDays } from "lucide-react";
import { daysUntil } from "@/lib/utils";
import Link from "next/link";

const KEY_SESSION_ORDER = ["RACE", "HYROX_SIM", "LONG_RUN", "INTERVALS", "TEMPO", "HYROX_STATION_WORK", "STRENGTH"];

const PHASE_COLORS: Record<string, string> = {
  Base:  "rgba(99,102,241,0.6)",
  Build: "rgba(249,115,22,0.6)",
  Peak:  "rgba(239,68,68,0.7)",
  Taper: "rgba(234,179,8,0.6)",
  Race:  "rgba(255,255,255,0.8)",
};

export default async function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const session = await auth();
  const userId = session!.user!.id as string;
  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
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
    const workoutRow: WorkoutDetailData = {
      id: w.id,
      type: w.type,
      title: w.title,
      description: w.description,
      targetDistance: w.targetDistance,
      targetDuration: w.targetDuration,
      targetPace: w.targetPace,
      status: w.status,
      dayOfWeek,
      perceivedEffort: w.perceivedEffort,
      actualDistance: w.actualDistance,
      scheduledDate: w.scheduledDate.toISOString(),
      intensityZone: w.intensityZone,
      strengthBlocks: (w.strengthBlocks as WorkoutDetailData["strengthBlocks"]) ?? null,
      warmup: w.warmup ?? null,
      cooldown: w.cooldown ?? null,
      coachingCues: w.coachingCues ?? null,
    };
    weekMap.get(weekNum)!.push(workoutRow as WorkoutRowData);
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
  const phaseSegments: { phase: string; count: number; startsAtCurrentWeek: boolean; isPastPhase: boolean; isFuturePhase: boolean }[] = [];
  for (const w of weeks) {
    const last = phaseSegments[phaseSegments.length - 1];
    if (last && last.phase === w.phase) {
      last.count++;
      if (w.isCurrentWeek) last.startsAtCurrentWeek = true;
      if (!w.isPast) last.isPastPhase = false;
    } else {
      phaseSegments.push({ phase: w.phase, count: 1, startsAtCurrentWeek: w.isCurrentWeek, isPastPhase: w.isPast, isFuturePhase: false });
    }
  }
  // Mark future phases
  for (const seg of phaseSegments) {
    if (seg.phase !== currentPhase && !seg.isPastPhase && !seg.startsAtCurrentWeek) {
      seg.isFuturePhase = true;
    }
  }

  // Days to event — use Eastern time so counter doesn't flip at midnight UTC (8 PM EDT)
  const daysOut = daysUntil(plan.event.date);

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

      {/* Back link + actions */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          ← Events
        </Link>
        <div className="flex items-center gap-2">
          <RestoreTemplateButton planId={plan.id} />
          <ResolveConflictsButton />
        </div>
      </div>

      {/* Pause/resume toggle — shows banner when paused, ghost button when active */}
      <PlanStatusToggle planId={plan.id} initialStatus={plan.status} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-2">
            Training Plan
          </p>
          <h1 className="text-[1.75rem] sm:text-[2.5rem] font-black tracking-tight leading-none">{plan.event.name}</h1>
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
          <p className="text-[2.5rem] sm:text-[3.5rem] font-black tabular-nums leading-none" style={{ color: accentColor }}>
            {daysOut}
          </p>
          <p className="text-[9px] font-semibold tracking-[0.18em] text-muted-foreground/30 uppercase mt-1">days out</p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Weeks", value: `${plan.currentWeek} / ${plan.totalWeeks}`, sub: "current" },
          { label: "Miles logged", value: `${completedMiles}`, sub: `of ${totalPlannedMiles} planned` },
          { label: "Completion", value: completionPct > 0 ? `${completionPct}%` : "—", sub: `${totalCompleted} / ${totalNonRest} sessions` },
          { label: "Phase", value: currentPhase, sub: "current" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl bg-card p-4 sm:p-5">
            <p className="text-[9px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-1.5">{stat.label}</p>
            <p className="text-[1.4rem] font-black leading-none tabular-nums"
              style={stat.label === "Phase" ? { color: PHASE_COLORS[stat.value] ?? accentColor, fontSize: "1rem" } : undefined}>
              {stat.value}
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-2">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Phase timeline strip */}
      <PlanArcBar
        phaseSegments={phaseSegments}
        currentPhase={currentPhase}
        accentColor={accentColor}
        totalWeeks={plan.totalWeeks}
      />

      {/* Day-of-week column headers — desktop only, matches WeekRow day grid */}
      <div className="hidden md:flex items-center gap-4 px-4">
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
          <div key={si} id={`phase-${section.phase}`}>
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
                  planIsPaused={plan.status === "PAUSED"}
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
