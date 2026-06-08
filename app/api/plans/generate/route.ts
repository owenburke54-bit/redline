import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { selectTemplate, buildPlan, summarizePlanForAI, isTriathlonEvent } from "@/lib/plans/planBuilder";
import { buildPlanGenerationPrompt } from "@/lib/ai/coachPrompts";
import { weeksUntil } from "@/lib/utils";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/lib/ai/config";
import { parseClaudeJson } from "@/lib/ai/parseJson";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { z } from "zod";
import { aiOverridesSchema } from "@/lib/validation/schemas";
import { enrichStrengthWorkouts, type StrengthWorkoutInput } from "@/lib/plans/strengthEnricher";

const schema = z.object({
  eventId: z.string(),
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });


export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;

  const { allowed, retryAfterSecs } = checkRateLimit(userId);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. Try again in ${Math.ceil(retryAfterSecs / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSecs) } }
    );
  }

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

  if (isTriathlonEvent(event.type)) {
    return NextResponse.json(
      { error: "Triathlon plans (swim/bike/run) are coming soon. Your event has been saved — we'll notify you when triathlon planning is available." },
      { status: 422 }
    );
  }

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
  let aiOverrides: object | null = null;
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = parseClaudeJson(text);
    const validated = aiOverridesSchema.safeParse(parsed);
    if (validated.success) {
      aiOverrides = validated.data as object;
    } else {
      console.warn("AI overrides failed schema validation — proceeding with template only", validated.error.flatten());
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

  const HARD_SESSIONS = new Set(["LONG_RUN", "INTERVALS", "TEMPO", "RACE", "HYROX_SIM"]);
  const RUN_TYPES = new Set(["EASY_RUN", "LONG_RUN", "TEMPO", "INTERVALS", "RACE"]);
  const COMPLEMENTARY_TYPES = new Set(["HYROX_STATION_WORK", "STRENGTH"]);

  const existingByDate = new Map<string, (typeof existingWorkouts[0])[]>();
  for (const w of existingWorkouts) {
    const key = w.scheduledDate.toISOString().split("T")[0];
    if (!existingByDate.has(key)) existingByDate.set(key, []);
    existingByDate.get(key)!.push(w);
  }

  function adjDateKeys(key: string): [string, string] {
    const d = new Date(key + "T12:00:00Z");
    return [
      new Date(d.getTime() - 86400000).toISOString().split("T")[0],
      new Date(d.getTime() + 86400000).toISOString().split("T")[0],
    ];
  }

  const filteredWorkouts: typeof builtPlan.workouts = [];
  const idsToDelete: string[] = [];

  for (const w of builtPlan.workouts) {
    const key = new Date(w.scheduledDate).toISOString().split("T")[0];
    const dayExisting = existingByDate.get(key) ?? [];
    const dayNonRest = dayExisting.filter(e => e.type !== "REST");

    // Check adjacent days for hard sessions from existing plans
    const [prevKey, nextKey] = adjDateKeys(key);
    const adjExisting = [
      ...(existingByDate.get(prevKey) ?? []),
      ...(existingByDate.get(nextKey) ?? []),
    ].filter(e => e.type !== "REST");
    const adjHard = adjExisting.filter(e => HARD_SESSIONS.has(e.type));
    const adjHasLongRun = adjExisting.some(e => e.type === "LONG_RUN" || e.type === "RACE");

    // REST: always keep
    if (w.type === "REST") {
      filteredWorkouts.push(w);
      continue;
    }

    // CROSS_TRAIN: skip if same day already has non-rest activity
    if (w.type === "CROSS_TRAIN") {
      if (dayNonRest.length === 0) filteredWorkouts.push(w);
      continue;
    }

    // HARD session: skip if adjacent to existing HARD session from another plan
    if (HARD_SESSIONS.has(w.type) && adjHard.length > 0) {
      continue;
    }

    // COMPLEMENTARY (STATION_WORK, STRENGTH): skip if same day has existing HARD session
    if (COMPLEMENTARY_TYPES.has(w.type)) {
      if (dayNonRest.some(e => HARD_SESSIONS.has(e.type))) continue;
      filteredWorkouts.push(w);
      continue;
    }

    if (RUN_TYPES.has(w.type)) {
      // Skip runs > 4mi on the day immediately after a long run/race from another plan
      if ((w.targetDistance ?? 0) > 4 && adjHasLongRun) {
        continue;
      }

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

  // Fire-and-forget: generate rich strength content for STRENGTH and HYROX_STATION_WORK workouts.
  // We fetch the newly inserted workout IDs then enrich them in parallel.
  // This runs after the response is sent so plan generation stays fast.
  const strengthTypes = new Set(["STRENGTH", "HYROX_STATION_WORK"]);
  const strengthTemplateWorkouts = filteredWorkouts.filter(w => strengthTypes.has(w.type));

  if (strengthTemplateWorkouts.length > 0) {
    // Compute weekInPhase for each strength workout
    const phaseWeekCounters = new Map<string, number>();
    // Sort by week so counter increments in order
    const sortedStrength = [...strengthTemplateWorkouts].sort((a, b) => a.week - b.week);
    const weekInPhaseMap = new Map<string, number>(); // key: `${phase}-${week}`
    for (const w of sortedStrength) {
      const phaseKey = (w.phase ?? "base").toLowerCase();
      const count = (phaseWeekCounters.get(phaseKey) ?? 0) + 1;
      phaseWeekCounters.set(phaseKey, count);
      weekInPhaseMap.set(`${phaseKey}-${w.week}`, count);
    }

    // Fetch IDs for the newly created strength workouts
    db.workout.findMany({
      where: {
        planId: plan.id,
        type: { in: ["STRENGTH", "HYROX_STATION_WORK"] },
      },
      select: { id: true, title: true, description: true, targetDuration: true, scheduledDate: true },
    }).then(dbWorkouts => {
      // Match with template workouts to get week/phase info
      const enrichList = dbWorkouts.map(dbW => {
        const match = strengthTemplateWorkouts.find(
          tw => tw.title === dbW.title && new Date(tw.scheduledDate).toISOString().split("T")[0] === dbW.scheduledDate.toISOString().split("T")[0]
        );
        const phase = match?.phase ?? "Base";
        const week = match?.week ?? 1;
        const phaseKey = phase.toLowerCase();
        return {
          id: dbW.id,
          title: dbW.title,
          description: dbW.description,
          targetDuration: dbW.targetDuration,
          week,
          phase,
          weekInPhase: weekInPhaseMap.get(`${phaseKey}-${week}`),
          totalPlanWeeks: builtPlan.totalWeeks,
        };
      });
      // gender from AthleteProfile — no gender field in schema, pass null
      return enrichStrengthWorkouts(plan.id, enrichList, event.type, null);
    }).catch(err => {
      console.error("[plans/generate] Strength enrichment failed:", err);
    });
  }

  after(async () => {
    const { computeAthleteModel } = await import("@/lib/athlete/computeAthleteModel");
    await computeAthleteModel(userId).catch(() => {});
  });

  return NextResponse.json({ planId: plan.id, templateBase: templateKey, totalWeeks: builtPlan.totalWeeks });
}
