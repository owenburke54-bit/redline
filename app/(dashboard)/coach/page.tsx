import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CoachChat } from "@/components/coach/CoachChat";
import { TodayWorkouts } from "@/components/dashboard/TodayWorkouts";
import { daysUntil } from "@/lib/utils";

export default async function CoachPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

  const [events, todayWorkouts] = await Promise.all([
    db.event.findMany({
      where: { userId, isActive: true },
      orderBy: { date: "asc" },
    }),
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: todayStart, lt: todayEnd } },
      include: { plan: { include: { event: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  const nonRestWorkouts = todayWorkouts.filter(w => w.type !== "REST");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-2">
          Training
        </p>
        <h1 className="text-[2rem] font-black tracking-tight leading-none">AI Coach</h1>
        {events.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {events.map(e => `${e.name} — ${daysUntil(e.date)} days out`).join("  ·  ")}
          </p>
        )}
      </div>

      {/* Today's workouts — quick log from the coach page */}
      {nonRestWorkouts.length > 0 && (
        <div className="shrink-0 mb-4">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-2">
            Today's sessions
          </p>
          <TodayWorkouts
            workouts={nonRestWorkouts.map(w => ({
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
        </div>
      )}

      {/* Chat — fills remaining height */}
      <div className="flex-1 min-h-0">
        <CoachChat />
      </div>
    </div>
  );
}
