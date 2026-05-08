import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getMonday } from "@/lib/utils";
import { TrainingLoadChart } from "@/components/progress/TrainingLoadChart";
import { ConsistencyChart } from "@/components/progress/ConsistencyChart";
import { TrendingUp, CheckCircle2, Layers, Timer } from "lucide-react";

export default async function ProgressPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const now = new Date();
  const currentMonday = getMonday(now);

  // 4 weeks back → 8 weeks forward = 12-week window
  const rangeStart = new Date(currentMonday);
  rangeStart.setDate(rangeStart.getDate() - 4 * 7);
  const rangeEnd = new Date(currentMonday);
  rangeEnd.setDate(rangeEnd.getDate() + 8 * 7 - 1);
  rangeEnd.setHours(23, 59, 59, 999);

  const [workouts, plans] = await Promise.all([
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: rangeStart, lte: rangeEnd } },
      select: {
        scheduledDate: true,
        type: true,
        status: true,
        targetDistance: true,
        plan: { select: { event: { select: { type: true } } } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
    db.trainingPlan.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        event: { select: { name: true, type: true, date: true } },
        workouts: { select: { status: true, type: true } },
      },
    }),
  ]);

  // Build 12-week stats array
  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const weekMon = new Date(rangeStart);
    weekMon.setDate(weekMon.getDate() + i * 7);
    const weekSun = new Date(weekMon);
    weekSun.setDate(weekSun.getDate() + 6);
    weekSun.setHours(23, 59, 59, 999);

    const weekWorkouts = workouts.filter(w => {
      const d = new Date(w.scheduledDate);
      return d >= weekMon && d <= weekSun;
    });

    const nonRest = weekWorkouts.filter(w => w.type !== "REST");
    const completed = weekWorkouts.filter(w => w.status === "COMPLETED").length;
    const planned = nonRest.length;

    const marathonMi = nonRest
      .filter(w => !w.plan.event.type.startsWith("HYROX"))
      .reduce((s, w) => s + (w.targetDistance ?? 0), 0);

    const hyroxMi = nonRest
      .filter(w => w.plan.event.type.startsWith("HYROX"))
      .reduce((s, w) => s + (w.targetDistance ?? 0), 0);

    const isPast = weekSun < now;
    const isCurrentWeek =
      weekMon.getTime() === currentMonday.getTime();

    return {
      label: weekMon.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      marathonMi: Math.round(marathonMi * 10) / 10,
      hyroxMi: Math.round(hyroxMi * 10) / 10,
      completed,
      planned,
      rate: planned > 0 ? Math.round((completed / planned) * 100) : 0,
      isPast,
      isCurrentWeek,
    };
  });

  // Summary stats
  const currentWeekData = weeklyData.find(w => w.isCurrentWeek)!;
  const past4 = weeklyData.filter(w => w.isPast).slice(-4);
  const past4Planned = past4.reduce((s, w) => s + w.planned, 0);
  const past4Completed = past4.reduce((s, w) => s + w.completed, 0);
  const fourWeekRate = past4Planned > 0
    ? Math.round((past4Completed / past4Planned) * 100)
    : null;

  // Streak: consecutive past weeks with at least 1 completed workout
  let streak = 0;
  for (const week of [...weeklyData].filter(w => w.isPast).reverse()) {
    if (week.completed > 0) streak++;
    else break;
  }

  // Days to nearest event
  const nearestEvent = plans
    .map(p => p.event)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const daysToEvent = nearestEvent
    ? Math.ceil((nearestEvent.date.getTime() - now.getTime()) / 86400000)
    : null;

  const hasMarathon = plans.some(p => !p.event.type.startsWith("HYROX"));
  const hasHyrox = plans.some(p => p.event.type.startsWith("HYROX"));

  // Plan progress stats
  const planStats = plans.map(plan => {
    const nonRestWorkouts = plan.workouts.filter(w => w.type !== "REST");
    const completedCount = nonRestWorkouts.filter(w => w.status === "COMPLETED").length;
    const totalCount = nonRestWorkouts.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isHyrox = plan.event.type.startsWith("HYROX");
    return {
      id: plan.id,
      eventName: plan.event.name,
      isHyrox,
      currentWeek: plan.currentWeek,
      totalWeeks: plan.totalWeeks,
      completedCount,
      totalCount,
      pct,
    };
  });

  const thisWeekMi = currentWeekData.marathonMi + currentWeekData.hyroxMi;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">
          12-week training overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="This week"
          value={thisWeekMi > 0 ? `${thisWeekMi.toFixed(0)} mi` : `${currentWeekData.planned} sessions`}
          sub={thisWeekKm > 0 ? "planned volume" : "planned"}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="4-week rate"
          value={fourWeekRate !== null ? `${fourWeekRate}%` : "—"}
          sub="completion"
          accent={fourWeekRate !== null
            ? fourWeekRate >= 80
              ? "var(--hyrox-color)"
              : fourWeekRate >= 50
              ? "var(--marathon-color)"
              : undefined
            : undefined}
        />
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Streak"
          value={streak > 0 ? `${streak}wk` : "—"}
          sub="consecutive weeks"
          accent={streak >= 4 ? "var(--hyrox-color)" : streak >= 1 ? "var(--marathon-color)" : undefined}
        />
        <StatCard
          icon={<Timer className="h-4 w-4" />}
          label="Next event"
          value={daysToEvent !== null ? `${daysToEvent}d` : "—"}
          sub={nearestEvent?.name ?? "no events"}
          accent="var(--marathon-color)"
        />
      </div>

      {/* Training load chart */}
      {plans.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Weekly Training Load</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Planned miles by week — past 4 weeks + next 8
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasMarathon && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[var(--marathon-color)]" />
                  <span className="text-xs text-muted-foreground">Run</span>
                </div>
              )}
              {hasHyrox && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[var(--hyrox-color)]" />
                  <span className="text-xs text-muted-foreground">Hyrox</span>
                </div>
              )}
            </div>
          </div>
          <div className="rounded border border-border bg-card p-4">
            <TrainingLoadChart
              data={weeklyData}
              hasMarathon={hasMarathon}
              hasHyrox={hasHyrox}
            />
          </div>
        </section>
      ) : (
        <EmptyState />
      )}

      {/* Plan progress */}
      {planStats.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-4">Plan Progress</h2>
          <div className="space-y-3">
            {planStats.map(plan => (
              <div key={plan.id} className="rounded border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">{plan.eventName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Week {plan.currentWeek} of {plan.totalWeeks}
                      {plan.totalCount > 0 && ` · ${plan.completedCount}/${plan.totalCount} workouts done`}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: plan.isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)" }}
                  >
                    {Math.round((plan.currentWeek / plan.totalWeeks) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((plan.currentWeek / plan.totalWeeks) * 100)}%`,
                      backgroundColor: plan.isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Consistency chart — only show if there's training history */}
      {past4Planned > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Consistency</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completed vs planned sessions per week
            </p>
          </div>
          <div className="rounded border border-border bg-card p-4">
            <ConsistencyChart
              data={weeklyData.map(w => ({
                label: w.label,
                completed: w.completed,
                planned: w.planned,
                rate: w.rate,
                isCurrentWeek: w.isCurrentWeek,
              }))}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className="text-2xl font-bold tabular-nums leading-none"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded border border-dashed border-border p-12 text-center">
      <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="font-medium text-sm">No training plans yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Add an event and generate a plan to see your training load here.
      </p>
    </div>
  );
}
