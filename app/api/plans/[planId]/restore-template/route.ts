import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getTemplate } from "@/lib/plans/planBuilder";
import type { PlanTemplateKey } from "@/lib/plans/planBuilder";

function getMondayUtc(date: Date): number {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    include: { workouts: { orderBy: { scheduledDate: "asc" } } },
  });

  if (!plan || plan.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = getTemplate(plan.templateBase as PlanTemplateKey);

  // Build lookup map: "weekNum:dayOfWeek" → template workout
  const tmplMap = new Map<string, (typeof template.weeks)[0]["workouts"][0]>();
  for (const week of template.weeks) {
    for (const w of week.workouts) {
      tmplMap.set(`${week.week}:${w.day}`, w);
    }
  }

  if (plan.workouts.length === 0) return NextResponse.json({ updated: 0 });

  // Plan start = Monday of the first workout (UTC)
  const planStartMs = getMondayUtc(plan.workouts[0].scheduledDate);

  const updates: Promise<unknown>[] = [];

  for (const workout of plan.workouts) {
    const workoutDayMs = Date.UTC(
      workout.scheduledDate.getUTCFullYear(),
      workout.scheduledDate.getUTCMonth(),
      workout.scheduledDate.getUTCDate()
    );
    const daysSinceStart = Math.round((workoutDayMs - planStartMs) / 86_400_000);
    const weekNum = Math.floor(daysSinceStart / 7) + 1;
    const dayOfWeek = daysSinceStart % 7;

    const tmpl = tmplMap.get(`${weekNum}:${dayOfWeek}`);
    if (!tmpl) continue;

    // Type must match — don't overwrite if AI swapped the workout type
    if ((tmpl.type as string) !== (workout.type as string)) continue;

    updates.push(
      db.workout.update({
        where: { id: workout.id },
        data: {
          title: tmpl.title,
          description: tmpl.description,
          intensityZone: tmpl.intensityZone ?? null,
        },
      })
    );
  }

  await Promise.all(updates);

  return NextResponse.json({ updated: updates.length });
}
