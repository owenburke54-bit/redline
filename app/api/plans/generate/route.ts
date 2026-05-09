import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { selectTemplate, buildPlan, summarizePlanForAI } from "@/lib/plans/planBuilder";
import { buildPlanGenerationPrompt } from "@/lib/ai/coachPrompts";
import { weeksUntil } from "@/lib/utils";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const schema = z.object({
  eventId: z.string(),
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { eventId } = parsed.data;

  // Load event, user, profile, and all other events
  const [event, user, profile, allEvents] = await Promise.all([
    db.event.findFirst({ where: { id: eventId, userId } }),
    db.user.findUnique({ where: { id: userId } }),
    db.athleteProfile.findUnique({ where: { userId } }),
    db.event.findMany({ where: { userId, isActive: true } }),
  ]);

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Check if plan already exists
  const existingPlan = await db.trainingPlan.findUnique({ where: { eventId } });
  if (existingPlan) return NextResponse.json({ error: "Plan already exists for this event" }, { status: 409 });

  const raceDate = new Date(event.date);
  const dedicationScore = user?.dedicationScore ?? 7;

  // Select and build template
  const templateKey = selectTemplate(
    event.type,
    raceDate,
    dedicationScore,
    profile?.weeklyMileageBaseline
  );
  const builtPlan = buildPlan(templateKey, raceDate);
  const templateSummary = summarizePlanForAI(builtPlan);

  // Build AI prompt
  const prompt = buildPlanGenerationPrompt({
    athleteName: user?.name ?? "Athlete",
    dedicationScore,
    profile: {
      yearsRunning: profile?.yearsRunning,
      weeklyMileageBaseline: profile?.weeklyMileageBaseline,
      injuryHistory: profile?.injuryHistory,
      goalStatement: profile?.goalStatement,
      painToleranceRating: profile?.painToleranceRating,
    },
    event: {
      name: event.name,
      type: event.type,
      date: raceDate.toDateString(),
      goalTime: event.goalTime,
      weeksOut: weeksUntil(raceDate),
    },
    allEvents: allEvents.map(e => ({
      name: e.name,
      type: e.type,
      date: new Date(e.date).toDateString(),
      weeksOut: weeksUntil(e.date),
    })),
    templateSummary,
  });

  // Call Claude for AI delta
  let aiOverrides: unknown = null;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiOverrides = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    // If AI fails, proceed with template only
    console.error("AI plan generation failed:", err);
  }

  // Conflict resolution: check existing workouts from other plans
  const existingWorkouts = await db.workout.findMany({
    where: { userId },
    select: { id: true, scheduledDate: true, type: true, targetDistance: true, intensityZone: true },
  });

  const RUN_TYPES = new Set(["EASY_RUN", "LONG_RUN", "TEMPO", "INTERVALS", "RACE"]);
  const COMPLEMENTARY_TYPES = new Set(["HYROX_STATION_WORK", "STRENGTH", "HYROX_SIM"]);

  const existingByDate = new Map<string, (typeof existingWorkouts[0])[]>();
  for (const w of existingWorkouts) {
    const key = w.scheduledDate.toISOString().split("T")[0];
    if (!existingByDate.has(key)) existingByDate.set(key, []);
    existingByDate.get(key)!.push(w);
  }

  const filteredWorkouts: typeof builtPlan.workouts = [];
  const idsToDelete: string[] = [];

  for (const w of builtPlan.workouts) {
    const key = new Date(w.scheduledDate).toISOString().split("T")[0];
    const dayExisting = existingByDate.get(key) ?? [];
    const dayNonRest = dayExisting.filter(e => e.type !== "REST");

    if (dayNonRest.length === 0) {
      filteredWorkouts.push(w);
      continue;
    }

    if (w.type === "REST" || w.type === "CROSS_TRAIN") continue;

    if (COMPLEMENTARY_TYPES.has(w.type)) {
      filteredWorkouts.push(w);
      continue;
    }

    if (RUN_TYPES.has(w.type)) {
      const existingRun = dayNonRest.find(e => RUN_TYPES.has(e.type));
      if (!existingRun) {
        filteredWorkouts.push(w);
      } else {
        const newScore = (w.targetDistance ?? 0) * 10 + (w.intensityZone ?? 0);
        const exScore = (existingRun.targetDistance ?? 0) * 10 + (existingRun.intensityZone ?? 0);
        if (newScore > exScore) {
          idsToDelete.push(existingRun.id);
          filteredWorkouts.push(w);
        }
        // else: keep existing run, skip new
      }
      continue;
    }

    filteredWorkouts.push(w);
  }

  // Persist plan and workouts in a transaction
  const plan = await db.$transaction(async (tx) => {
    if (idsToDelete.length > 0) {
      await tx.workout.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    const newPlan = await tx.trainingPlan.create({
      data: {
        userId,
        eventId,
        templateBase: templateKey,
        weeklyStructure: builtPlan.weeks as unknown as object[],
        aiOverrides: aiOverrides as object ?? undefined,
        totalWeeks: builtPlan.totalWeeks,
        currentWeek: 1,
        lastAiReview: new Date(),
      },
    });

    await tx.workout.createMany({
      data: filteredWorkouts.map(w => ({
        userId,
        planId: newPlan.id,
        scheduledDate: new Date(w.scheduledDate),
        type: w.type as Parameters<typeof tx.workout.create>[0]["data"]["type"],
        title: w.title,
        description: w.description,
        targetDistance: w.targetDistance ?? null,
        targetDuration: w.targetDuration ?? null,
        targetPace: w.targetPace ?? null,
        intensityZone: w.intensityZone ?? null,
        stations: w.stations ? w.stations as object : undefined,
        isHyroxSim: w.isHyroxSim,
        aiModified: false,
      })),
    });

    return newPlan;
  });

  return NextResponse.json({ planId: plan.id, templateBase: templateKey, totalWeeks: builtPlan.totalWeeks });
}
