import { auth } from "@/auth";
import { db } from "@/lib/db";
import { daysUntil, formatDate } from "@/lib/utils";
import { Trophy, Zap, MessageSquare, ChevronRight } from "lucide-react";
import Link from "next/link";

function recoveryColor(score: number): string {
  if (score >= 67) return "#22c55e";
  if (score >= 34) return "#f59e0b";
  return "#ef4444";
}

function recoveryLabel(score: number): string {
  if (score >= 67) return "Green";
  if (score >= 34) return "Yellow";
  return "Red";
}

function trainingImpact(
  score: number,
  todayWorkoutTitle: string | null,
  recentHighStrainSport: { sportName: string; strain: number } | null
): string {
  const sportNote = recentHighStrainSport
    ? ` ${recentHighStrainSport.sportName} recently (strain ${recentHighStrainSport.strain.toFixed(1)}) is already on the books.`
    : "";

  if (score >= 67) {
    if (todayWorkoutTitle) return `Full green. Execute ${todayWorkoutTitle} at target effort.${sportNote}`;
    return `Full green. No structured session today — use it for active recovery or extra mobility.`;
  }
  if (score >= 34) {
    if (todayWorkoutTitle) return `Moderate readiness. ${todayWorkoutTitle} is on — keep to prescribed effort, don't add volume.${sportNote}`;
    return `Moderate readiness. Rest day is well-timed.${sportNote}`;
  }
  if (todayWorkoutTitle) return `Low recovery. Consider dropping ${todayWorkoutTitle} to easy effort or swapping for rest.${sportNote}`;
  return `Low recovery. Rest day is the right call.${sportNote}`;
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [user, events, todayWorkouts, todayRecovery, recentActivities] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, dedicationScore: true, whoopAccessToken: true, whoopId: true } }),
    db.event.findMany({ where: { userId, isActive: true }, orderBy: { date: "asc" } }),
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: todayStart, lt: todayEnd } },
      include: { plan: { include: { event: true } } },
    }),
    db.whoopRecovery.findFirst({
      where: { userId, date: { gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: "desc" },
      select: { recoveryScore: true, hrvRmssd: true, restingHr: true, sleepScore: true, sleepDuration: true, date: true },
    }),
    db.whoopActivity.findMany({
      where: { userId, startDate: { gte: sevenDaysAgo }, sportName: { notIn: ["Running", "Cycling"] } },
      orderBy: { startDate: "desc" },
      select: { sportName: true, startDate: true, strain: true },
      take: 5,
    }),
  ]);

  const whoopConnected = !!(user?.whoopAccessToken && user?.whoopId);

  const recentHighStrain = recentActivities.find(
    a => a.strain >= 10 && a.startDate >= fortyEightHoursAgo
  ) ?? null;

  const hardTodayWorkout = todayWorkouts.find(
    w => !["REST", "EASY_RUN", "CROSS_TRAIN"].includes(w.type)
  );
  const todayWorkoutTitle = hardTodayWorkout?.title ?? null;

  return (
    <div className="max-w-3xl space-y-12">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/50 uppercase mb-2">
          {getTimeOfDay()}
        </p>
        <h1 className="text-[3.25rem] font-black tracking-tight leading-none text-foreground">
          {user?.name?.split(" ")[0] ?? "Athlete"}.
        </h1>
        <p className="text-[13px] text-muted-foreground mt-4">
          Dedication score —{" "}
          <span className="text-primary font-bold">{user?.dedicationScore}/10</span>
        </p>
      </div>

      {/* WHOOP recovery */}
      {whoopConnected && (
        <section>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-4">
            Recovery
          </p>
          {todayRecovery ? (
            <div className="rounded-xl bg-card overflow-hidden">
              <div className="h-[3px]" style={{ backgroundColor: recoveryColor(todayRecovery.recoveryScore) }} />
              <div className="p-5">
                <div className="flex items-start gap-6">
                  {/* Big score */}
                  <div className="shrink-0">
                    <p
                      className="text-[3.25rem] font-black tabular-nums leading-none"
                      style={{ color: recoveryColor(todayRecovery.recoveryScore) }}
                    >
                      {Math.round(todayRecovery.recoveryScore)}
                      <span className="text-[1.5rem] font-bold">%</span>
                    </p>
                    <p
                      className="text-[10px] font-bold tracking-[0.15em] uppercase mt-1"
                      style={{ color: recoveryColor(todayRecovery.recoveryScore) }}
                    >
                      {recoveryLabel(todayRecovery.recoveryScore)}
                    </p>
                  </div>

                  {/* Biometrics + impact */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-4 mb-3">
                      {todayRecovery.hrvRmssd && (
                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground/40 uppercase">HRV</p>
                          <p className="text-[13px] font-bold tabular-nums">{Math.round(todayRecovery.hrvRmssd)}ms</p>
                        </div>
                      )}
                      {todayRecovery.restingHr && (
                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground/40 uppercase">RHR</p>
                          <p className="text-[13px] font-bold tabular-nums">{Math.round(todayRecovery.restingHr)}bpm</p>
                        </div>
                      )}
                      {todayRecovery.sleepDuration && (
                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground/40 uppercase">Sleep</p>
                          <p className="text-[13px] font-bold tabular-nums">{(todayRecovery.sleepDuration / 60).toFixed(1)}h</p>
                        </div>
                      )}
                      {todayRecovery.sleepScore && (
                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground/40 uppercase">Sleep score</p>
                          <p className="text-[13px] font-bold tabular-nums">{Math.round(todayRecovery.sleepScore)}%</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {trainingImpact(todayRecovery.recoveryScore, todayWorkoutTitle, recentHighStrain)}
                    </p>
                  </div>
                </div>

                {/* Recent other activities */}
                {recentActivities.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
                    {recentActivities.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-white/5 text-muted-foreground"
                      >
                        {a.sportName}
                        <span className="text-muted-foreground/50">
                          {a.startDate.toLocaleDateString("en-US", { weekday: "short" })} · {a.strain.toFixed(1)} strain
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-card p-5">
              <p className="text-[13px] font-semibold text-foreground">WHOOP connected</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Recovery data posts each morning after sleep. Check back tomorrow.
              </p>
              {recentActivities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
                  {recentActivities.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-white/5 text-muted-foreground"
                    >
                      {a.sportName}
                      <span className="text-muted-foreground/50">
                        {a.startDate.toLocaleDateString("en-US", { weekday: "short" })} · {a.strain.toFixed(1)} strain
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Upcoming events */}
      {events.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-4">
            Upcoming Events
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((event) => {
              const days = daysUntil(event.date);
              const isHyrox = event.type.startsWith("HYROX");
              const color = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";
              return (
                <div
                  key={event.id}
                  className="rounded-xl bg-card overflow-hidden"
                >
                  <div className="h-[3px]" style={{ backgroundColor: color }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 pt-0.5">
                        <p className="font-semibold text-[13px] text-foreground leading-tight truncate">
                          {event.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatDate(event.date)}
                        </p>
                        {event.goalTime && (
                          <p
                            className="text-[11px] font-semibold mt-2.5"
                            style={{ color }}
                          >
                            Goal: {event.goalTime}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="text-[3rem] font-black tabular-nums leading-none"
                          style={{ color }}
                        >
                          {days}
                        </p>
                        <p className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground/40 uppercase mt-1">
                          days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Coach CTA */}
      {events.length > 0 && (
        <section>
          <Link href="/coach">
            <div className="group rounded-xl border border-border bg-card p-5 hover:border-primary/25 hover:bg-primary/[0.025] transition-all duration-200 flex items-center gap-4 cursor-pointer">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">
                  Talk to your AI coach
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Discuss goals, strength programming, and race strategy.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
            </div>
          </Link>
        </section>
      )}

      {/* Today's workouts */}
      <section>
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-4">
          Today
        </p>
        {todayWorkouts.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No workouts scheduled today.
          </p>
        ) : (
          <div className="space-y-2">
            {todayWorkouts.map((w) => {
              const isHyrox = w.plan.event.type.startsWith("HYROX");
              const color = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";
              const completed = w.status === "COMPLETED";
              return (
                <div
                  key={w.id}
                  className="relative flex items-center gap-4 rounded-xl bg-card px-5 py-4 overflow-hidden"
                >
                  <span
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <Zap
                    className="h-4 w-4 shrink-0 ml-2"
                    style={{ color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{w.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {w.plan.event.name}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider shrink-0 px-2.5 py-1 rounded-full"
                    style={{
                      color: completed ? color : "var(--muted-foreground)",
                      backgroundColor: completed
                        ? "rgba(163,230,53,0.1)"
                        : "rgba(255,255,255,0.04)",
                    }}
                  >
                    {w.status.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 p-16 text-center">
          <Trophy className="h-7 w-7 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-semibold text-[13px] text-foreground">No events yet</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Add your first race to generate a training plan.
          </p>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
