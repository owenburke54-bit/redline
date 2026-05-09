import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CalendarView } from "@/components/calendar/CalendarView";
import { getMonday } from "@/lib/utils";

export default async function CalendarPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const now = new Date();
  const weekStart = getMonday(now);

  const [workouts, events] = await Promise.all([
    db.workout.findMany({
      where: { userId },
      include: {
        plan: { include: { event: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
    db.event.findMany({
      where: { userId, isActive: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const serializedWorkouts = workouts.map(w => ({
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
    conflictFlag: w.conflictFlag,
    conflictNote: w.conflictNote,
    eventType: w.plan.event.type,
    eventName: w.plan.event.name,
    planId: w.planId,
  }));

  return (
    <CalendarView
      workouts={serializedWorkouts}
      currentWeekStart={weekStart.toISOString()}
    />
  );
}
