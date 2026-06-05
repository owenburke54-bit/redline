import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { getTemplate } from "@/lib/plans/planBuilder";
import type { PlanTemplateKey } from "@/lib/plans/planBuilder";
import { enrichStrengthWorkouts } from "@/lib/plans/strengthEnricher";

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
  const STRENGTH_TYPES = new Set(["STRENGTH", "HYROX_STATION_WORK"]);
  const strengthToRenrich: Array<{ id: string; title: string; description: string; targetDuration: number | null; week: number; phase: string }> = [];

  // Pull weeklyStructure for phase lookup
  const weeklyStructure = Array.isArray(plan.weeklyStructure)
    ? (plan.weeklyStructure as Array<{ week: number; phase: string }>)
    : [];
  const phaseByWeek = new Map(weeklyStructure.map(w => [w.week, w.phase ?? "Base"]));

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

    const isStrength = STRENGTH_TYPES.has(workout.type as string);

    updates.push(
      db.workout.update({
        where: { id: workout.id },
        data: {
          title: tmpl.title,
          description: tmpl.description,
          intensityZone: tmpl.intensityZone ?? null,
          // Clear old strength enrichment so it gets regenerated with the new prompt
          ...(isStrength ? { strengthBlocks: Prisma.JsonNull, warmup: null, cooldown: null, coachingCues: null } : {}),
        },
      })
    );

    if (isStrength) {
      strengthToRenrich.push({
        id: workout.id,
        title: tmpl.title,
        description: tmpl.description,
        targetDuration: workout.targetDuration,
        week: weekNum,
        phase: phaseByWeek.get(weekNum) ?? "Base",
      });
    }
  }

  await Promise.all(updates);

  // Fire-and-forget re-enrichment for strength workouts
  if (strengthToRenrich.length > 0) {
    const event = await db.event.findUnique({ where: { id: plan.eventId }, select: { type: true } });
    const eventType = event?.type ?? "HYROX_16WK";
    enrichStrengthWorkouts(plan.id, strengthToRenrich, eventType, null).catch(err => {
      console.error("[restore-template] Strength enrichment failed:", err);
    });
  }

  return NextResponse.json({ updated: updates.length });
}
