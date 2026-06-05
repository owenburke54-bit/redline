import { auth } from "@/auth";
import { db } from "@/lib/db";
import { daysUntil, formatDate, getMonday } from "@/lib/utils";

import { WhoopSyncButton } from "@/components/whoop/WhoopSyncButton";
import { WhoopRings } from "@/components/whoop/WhoopRings";
import { GarminRings } from "@/components/garmin/GarminRings";
import { GarminSyncButton } from "@/components/garmin/GarminSyncButton";
import { TodayWorkouts } from "@/components/dashboard/TodayWorkouts";
import { WeeklyCheckinCard } from "@/components/dashboard/WeeklyCheckinCard";
import { CoachNudgeCard } from "@/components/coach/CoachNudgeCard";
import { WeeklyBriefCard } from "@/components/dashboard/WeeklyBriefCard";
import { DedicationScoreButton } from "@/components/dashboard/DedicationScoreButton";
import { PartnerSection } from "@/components/partner/PartnerSection";
import Link from "next/link";
import { redirect } from "next/navigation";

function recoveryColor(score: number): string {
  if (score >= 67) return "#00E87A";
  if (score >= 34) return "#FFB800";
  return "#FF2D2D";
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

function garminTrainingImpact(bodyBattery: number | null, todayWorkoutTitle: string | null): string {
  if (bodyBattery == null) return "Sync Garmin to get today's readiness.";
  if (bodyBattery >= 70) {
    return todayWorkoutTitle
      ? `High battery. Execute ${todayWorkoutTitle} at target effort.`
      : `High battery. No session today — good day for extra mobility or an easy shake-out.`;
  }
  if (bodyBattery >= 40) {
    return todayWorkoutTitle
      ? `Moderate battery. ${todayWorkoutTitle} is on — stay within prescribed effort, no extras.`
      : `Moderate battery. Rest day is well-timed.`;
  }
  return todayWorkoutTitle
    ? `Low battery. Consider dropping ${todayWorkoutTitle} to easy effort or swapping for rest.`
    : `Low battery. Rest is the right call today.`;
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekStart = getMonday(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [user, events, todayWorkouts, todayRecovery, recentActivities, todayCycle, todayGarmin, lastCheckin, weekWorkouts] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, dedicationScore: true, whoopAccessToken: true, whoopId: true, garminAccessToken: true, garminUserId: true } }),
    db.event.findMany({ where: { userId, isActive: true }, orderBy: { date: "asc" }, include: { plan: { select: { id: true } } } }),
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: todayStart, lt: todayEnd } },
      include: { plan: { include: { event: true } } },
    }),
    db.whoopRecovery.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { recoveryScore: true, hrvRmssd: true, restingHr: true, sleepScore: true, sleepDuration: true, date: true },
    }),
    db.whoopActivity.findMany({
      where: { userId, startDate: { gte: sevenDaysAgo }, sportName: { notIn: ["Running", "Cycling", "Cycle"] } },
      orderBy: { startDate: "desc" },
      select: { sportName: true, startDate: true, strain: true },
      take: 5,
    }),
    // Most recent WHOOP cycle = today's cumulative strain (the number shown in the WHOOP app ring)
    db.whoopActivity.findFirst({
      where: { userId, sportName: "Cycle" },
      orderBy: { startDate: "desc" },
      select: { strain: true },
    }),
    db.garminDailySummary.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { bodyBattery: true, stressAvg: true, restingHr: true, sleepScore: true, sleepDuration: true, sleepHrv: true, date: true },
    }),
    db.weeklyCheckin.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: weekStart, lt: weekEnd } },
      select: { status: true, type: true },
    }),
  ]);

  if (events.length === 0) redirect("/events");

  const whoopConnected = !!(user?.whoopAccessToken && user?.whoopId);
  const garminConnected = !!(user?.garminAccessToken && user?.garminUserId);

  const needsCheckin = !lastCheckin || (Date.now() - lastCheckin.createdAt.getTime()) > 6 * 86400000;
  const weekScheduledCount = weekWorkouts.filter(w => w.type !== "REST").length;
  const weekCompletedCount = weekWorkouts.filter(w => w.status === "COMPLETED").length;

  const todayStrain = todayCycle?.strain ?? null;

  const recentHighStrain = recentActivities.find(
    a => a.strain >= 10 && a.startDate >= fortyEightHoursAgo
  ) ?? null;

  const hardTodayWorkout = todayWorkouts.find(
    w => !["REST", "EASY_RUN", "CROSS_TRAIN"].includes(w.type)
  );
  const todayWorkoutTitle = hardTodayWorkout?.title ?? null;

  return (
    <div className="max-w-3xl space-y-8 md:space-y-12">
      {/* Greeting */}
      <div className="border-b pb-6" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
          {getTimeOfDay()}
        </p>
        <h1 className="text-[2.75rem] font-black tracking-tight leading-none text-foreground mb-3">
          {user?.name?.split(" ")[0] ?? "Athlete"}.
        </h1>
        <DedicationScoreButton score={user?.dedicationScore ?? 7} />
      </div>

      {/* WHOOP recovery */}
      {whoopConnected && (
        <section>
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase">
              Recovery
            </p>
            <WhoopSyncButton />
          </div>
          {(() => {
            const accentColor = todayRecovery
              ? todayRecovery.recoveryScore >= 67
                ? "#00E87A"
                : todayRecovery.recoveryScore >= 34
                ? "#FFB800"
                : "#FF2D2D"
              : "rgba(255,255,255,0.12)";
            return (
              <div className="card-base overflow-hidden">
                <div className="h-[3px]" style={{ backgroundColor: accentColor }} />
                <div className="p-5">
                  <WhoopRings
                    recoveryScore={todayRecovery?.recoveryScore ?? null}
                    strain={todayStrain}
                    sleepScore={todayRecovery?.sleepScore ?? null}
                    sleepDuration={todayRecovery?.sleepDuration ?? null}
                    hrvRmssd={todayRecovery?.hrvRmssd ?? null}
                    restingHr={todayRecovery?.restingHr ?? null}
                    impactText={
                      todayRecovery
                        ? trainingImpact(todayRecovery.recoveryScore, todayWorkoutTitle, recentHighStrain)
                        : "Recovery data posts each morning after sleep. Sync or check back tomorrow."
                    }
                    staleLabel={(() => {
                      if (!todayRecovery) return null;
                      const daysAgo = Math.floor((Date.now() - todayRecovery.date.getTime()) / 86400000);
                      return daysAgo > 1
                        ? `From ${todayRecovery.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} — tap Sync to refresh`
                        : null;
                    })()}
                    recentActivities={recentActivities}
                  />
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Garmin readiness */}
      {process.env.NEXT_PUBLIC_GARMIN_ENABLED === "true" && garminConnected && (
        <section>
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase">
              Readiness
            </p>
            <GarminSyncButton />
          </div>
          {(() => {
            const bb = todayGarmin?.bodyBattery ?? null;
            const accentColor = bb == null
              ? "rgba(255,255,255,0.12)"
              : bb >= 70 ? "#00E87A" : bb >= 40 ? "#FFB800" : "#FF2D2D";
            return (
              <div className="card-base overflow-hidden">
                <div className="h-[3px]" style={{ backgroundColor: accentColor }} />
                <div className="p-5">
                  <GarminRings
                    bodyBattery={bb}
                    sleepScore={todayGarmin?.sleepScore ?? null}
                    sleepDuration={todayGarmin?.sleepDuration ?? null}
                    restingHr={todayGarmin?.restingHr ?? null}
                    sleepHrv={todayGarmin?.sleepHrv ?? null}
                    stressAvg={todayGarmin?.stressAvg ?? null}
                    impactText={garminTrainingImpact(bb, todayWorkoutTitle)}
                    staleLabel={(() => {
                      if (!todayGarmin) return null;
                      const daysAgo = Math.floor((Date.now() - todayGarmin.date.getTime()) / 86400000);
                      return daysAgo > 1
                        ? `From ${todayGarmin.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} — tap Sync to refresh`
                        : null;
                    })()}
                  />
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Upcoming events */}
      {events.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-2 md:mb-4">
            Upcoming Events
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((event) => {
              const days = daysUntil(event.date);
              const isHyrox = event.type.startsWith("HYROX");
              const color = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";
              const href = event.plan?.id ? `/plan/${event.plan.id}` : `/events`;
              return (
                <Link key={event.id} href={href} className="block rounded-xl bg-card overflow-hidden hover:ring-1 transition-all" style={{ ["--tw-ring-color" as string]: color + "40" }}>
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
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Training partner */}
      <PartnerSection />

      {/* Weekly brief */}
      {events.length > 0 && (
        <section>
          <WeeklyBriefCard />
        </section>
      )}

      {/* Coach nudge — contextual, data-driven prompt */}
      {events.length > 0 && (() => {
        const nudge = getCoachNudge({
          recoveryScore: todayRecovery?.recoveryScore ?? null,
          bodyBattery: todayGarmin?.bodyBattery ?? null,
          daysUntilNextEvent: daysUntil(events[0].date),
          weekCompletedPct: weekScheduledCount > 0 ? weekCompletedCount / weekScheduledCount : 0,
          todayWorkoutTitle,
          lastCheckinDaysAgo: lastCheckin ? Math.floor((Date.now() - lastCheckin.createdAt.getTime()) / 86400000) : 999,
        });
        return (
          <section>
            <CoachNudgeCard prompt={nudge.prompt} subtext={nudge.subtext} />
          </section>
        );
      })()}

      {/* Weekly check-in */}
      {needsCheckin && weekScheduledCount > 0 && (
        <section>
          <WeeklyCheckinCard
            completedCount={weekCompletedCount}
            plannedCount={weekScheduledCount}
          />
        </section>
      )}

      {/* Today's workouts */}
      <section>
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-2 md:mb-4">
          Today
        </p>
        <TodayWorkouts
          workouts={todayWorkouts.map(w => ({
            id: w.id,
            scheduledDate: w.scheduledDate.toISOString(),
            type: w.type,
            title: w.title,
            description: w.description,
            targetDistance: w.targetDistance,
            targetDuration: w.targetDuration,
            targetPace: w.targetPace,
            intensityZone: w.intensityZone,
            isHyroxSim: w.isHyroxSim,
            status: w.status,
            actualDistance: w.actualDistance,
            actualDuration: w.actualDuration,
            perceivedEffort: w.perceivedEffort,
            conflictFlag: w.conflictFlag,
            conflictNote: w.conflictNote,
            eventType: w.plan.event.type,
            eventName: w.plan.event.name,
            goalTime: w.plan.event.goalTime,
            planId: w.planId,
          }))}
        />
      </section>

    </div>
  );
}

function getCoachNudge({
  recoveryScore,
  bodyBattery,
  daysUntilNextEvent,
  weekCompletedPct,
  todayWorkoutTitle,
  lastCheckinDaysAgo,
}: {
  recoveryScore: number | null;
  bodyBattery: number | null;
  daysUntilNextEvent: number;
  weekCompletedPct: number;
  todayWorkoutTitle: string | null;
  lastCheckinDaysAgo: number;
}): { prompt: string; subtext: string } {
  if (recoveryScore !== null && recoveryScore < 34) {
    return {
      prompt: `Recovery is in the red at ${recoveryScore}%. Should we dial back this week's training load?`,
      subtext: "Your coach noticed something",
    };
  }
  if (bodyBattery !== null && bodyBattery < 30) {
    return {
      prompt: `Body battery is depleted. Should we swap any sessions this week for easier work?`,
      subtext: "Your coach noticed something",
    };
  }
  if (daysUntilNextEvent <= 14) {
    return {
      prompt: `${daysUntilNextEvent} days to race day — want to walk through your race-week plan?`,
      subtext: "Final prep with your coach",
    };
  }
  if (daysUntilNextEvent <= 28) {
    return {
      prompt: `You're in the final stretch at ${daysUntilNextEvent} days out. Is your taper feeling right?`,
      subtext: "Check in with your coach",
    };
  }
  if (todayWorkoutTitle) {
    return {
      prompt: `You've got ${todayWorkoutTitle} today — want tips on how to execute it well?`,
      subtext: "Session guidance from your coach",
    };
  }
  if (weekCompletedPct < 0.4 && weekCompletedPct > 0) {
    return {
      prompt: "Less than half of this week's sessions are done. Want help deciding what to prioritize?",
      subtext: "Your coach can help",
    };
  }
  if (lastCheckinDaysAgo >= 6) {
    return {
      prompt: "How's your body holding up with the current training load? Let's check in.",
      subtext: "Weekly check-in with your coach",
    };
  }
  return {
    prompt: "Want to customize your plan to better fit your schedule and goals?",
    subtext: "Your coach can adjust any session",
  };
}

function getTimeOfDay(): string {
  // Use Eastern time — server runs UTC on Vercel
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }).format(new Date()),
    10
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
