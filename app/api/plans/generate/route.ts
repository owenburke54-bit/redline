import { NextRequest, NextResponse } from "next/server";
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

const schema = z.object({
  eventId: z.string(),
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Phase rules for strength generation ─────────────────────────────────────

function getPhaseRules(phase: string, eventType: string): string {
  const isRunningOnly =
    !eventType.startsWith("HYROX") &&
    !["TRIATHLON_SPRINT","TRIATHLON_OLYMPIC","HALF_IRONMAN","IRONMAN"].includes(eventType);

  if (isRunningOnly) {
    return "Running economy focus: single-leg stability, hip strength, calf resilience. No heavy bilateral lower body within 48h of long run. Upper body and core on easy run days.";
  }

  const lower = phase.toLowerCase();
  if (lower === "base") {
    return "Higher rep ranges (12-15), moderate load (RPE 6-7), longer rest (90s), unilateral focus. No heavy barbell work. Exercise selection: Bulgarian split squats, Romanian deadlifts, single-arm KB rows, goblet squats, hip thrusts, plank variations, pallof press. End with 10 min low-intensity carry.";
  }
  if (lower === "build") {
    return "Moderate reps (8-12), higher load (RPE 7-8), shorter rest (60s), circuit-style. Pair movements as supersets. Include at least one HYROX station simulation. Exercise selection: farmers carry progressions, sandbag cleans/squats, box step-ups with load, KB swings, wall ball.";
  }
  if (lower === "peak") {
    return "Lower volume (5-8 reps), race-pace intensity, minimal rest (30s). Full HYROX station circuits at target weight. Timed sled push/pull at race weight, heavy farmers carry at race distance.";
  }
  if (lower === "taper") {
    return "Reduce volume 40%, maintain intensity. Focus on movement quality. No new movements. Race-day prep focus.";
  }
  return "Moderate volume and intensity. Focus on movement quality and consistency.";
}

// ─── Strength content generator ───────────────────────────────────────────────

interface StrengthContent {
  strengthBlocks: unknown;
  warmup: string;
  cooldown: string;
  coachingCues: string;
}

async function generateStrengthContent(workout: {
  id: string;
  title: string;
  description: string;
  targetDuration: number | null;
}, weekNum: number, phase: string, eventType: string): Promise<StrengthContent | null> {
  const phaseRules = getPhaseRules(phase, eventType);

  const prompt = `You are generating a structured strength workout for a ${eventType} athlete in the ${phase} phase (week ${weekNum}).

SESSION CONTEXT: ${workout.title} — ${workout.description}
TARGET DURATION: ${workout.targetDuration ?? 45} minutes

Return ONLY valid JSON (no markdown, no explanation):
{
  "warmup": "5-8 min explicit warmup description",
  "coachingCues": "1-2 sentence coaching focus for this session",
  "strengthBlocks": [
    {
      "exercise": "Exercise name",
      "sets": 3,
      "reps": "10-12",
      "load": "load guidance string",
      "tempo": "3-1-1-0",
      "rest": "90s",
      "cue": "one sentence focus cue"
    }
  ],
  "cooldown": "5 min explicit cooldown description"
}

PHASE RULES:
${phaseRules}

The strengthBlocks array must have 3-5 exercises with ALL fields populated.`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = parseClaudeJson(text) as Record<string, unknown> | null;
    if (!parsed || !Array.isArray(parsed.strengthBlocks)) return null;

    return {
      strengthBlocks: parsed.strengthBlocks,
      warmup: typeof parsed.warmup === "string" ? parsed.warmup : "",
      cooldown: typeof parsed.cooldown === "string" ? parsed.cooldown : "",
      coachingCues: typeof parsed.coachingCues === "string" ? parsed.coachingCues : "",
    };
  } catch (err) {
    console.error(`Strength generation failed for workout ${workout.id}:`, err);
    return null;
  }
}

// ─── Post-insert: parallel strength generation (fire-and-forget) ──────────────

async function enrichStrengthWorkouts(
  planId: string,
  strengthWorkouts: Array<{ id: string; title: string; description: string; targetDuration: number | null; week: number; phase: string }>,
  eventType: string
): Promise<void> {
  await Promise.all(
    strengthWorkouts.map(async (w) => {
      const content = await generateStrengthContent(w, w.week, w.phase, eventType);
      if (!content) return;
      await db.workout.update({
        where: { id: w.id },
        data: {
          strengthBlocks: content.strengthBlocks as object,
          warmup: content.warmup || null,
          cooldown: content.cooldown || null,
          coachingCues: content.coachingCues || null,
        },
      });
    })
  );
  console.log(`[plans/generate] Enriched ${strengthWorkouts.length} strength workouts for plan ${planId}`);
}

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
        return {
          id: dbW.id,
          title: dbW.title,
          description: dbW.description,
          targetDuration: dbW.targetDuration,
          week: match?.week ?? 1,
          phase: match?.phase ?? "Base",
        };
      });
      return enrichStrengthWorkouts(plan.id, enrichList, event.type);
    }).catch(err => {
      console.error("[plans/generate] Strength enrichment failed:", err);
    });
  }

  return NextResponse.json({ planId: plan.id, templateBase: templateKey, totalWeeks: builtPlan.totalWeeks });
}
