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

// ─── HYROX strength system prompt (full knowledge base) ───────────────────────

const HYROX_STRENGTH_SYSTEM_PROMPT = `You are an elite HYROX-specialist strength coach. You write precise, station-specific workouts. Every exercise must serve a HYROX station or running economy. Do NOT generate generic bodybuilding.

THE 8 HYROX STATIONS (memorise these):
1. SkiErg 1000m — lats, core, shoulders. Lat pulldown strength, breathing under load.
2. Sled Push 50m — quad/glute dominant. Men Open 102kg, Women Open 72kg. Low position, leg drive.
3. Sled Pull 50m rope — posterior chain, grip endurance, row strength.
4. Burpee Broad Jumps 80m — explosive hip extension power.
5. RowErg 1000m — legs 60%, legs-back-arms sequence.
6. Farmers Carry 200m — Men 2x24kg, Women 2x16kg. Grip, shoulder packing, anti-lateral flexion.
7. Sandbag Lunges 100m — Men 20kg, Women 10kg. Late-race leg burner.
8. Wall Balls 100 reps — Men 9kg/10ft target, Women 6kg/9ft target. Squat-to-press, biggest mental station.

KEY PRINCIPLE: Each HYROX station follows a 1km run. Train the "compromised state" — strength on pre-fatigued legs. This is NOT bodybuilding. Every exercise must list which station it targets.

PHASE FRAMEWORK:
BASE: High reps (12-15), RPE 6-7, 90s rest, movement quality. Two session types — (A) lower/posterior: Goblet Squat 4x12-15 tempo 3-1-1-0, RDL 3x12, Bulgarian Split Squat 3x10 each, Hip Thrust 3x15, Copenhagen Plank 3x20s, Single-leg RDL 3x8. (B) upper/pull: Bent-over Row 4x12, Lat Pulldown 3x10-12, Pallof Press 3x12 each, Dead Bug 3x8, Face Pull 3x15, SkiErg 4x250m easy. Finisher: 10 min easy farmers carry walk. Coaching cues: "chest up, knees tracking" on squats; "hinge at hip, feel hamstring" on RDL; "retract scapula, lead with elbow" on rows; "lat not bicep" on pulldown.

BUILD: Moderate reps (8-12), RPE 7-8, 45-60s rest, supersets required, at least one "compromised state" set (1km run then straight into strength, no rest). Supersets: Sled Push sim 3x20m at race weight + Box Step-up 3x10 each; Trap Bar Deadlift 4x6-8 heavy + Sandbag Squat 3x10 race weight; Farmers Carry 3x50m race weight; Wall Ball 4x25 race weight; Sandbag Lunge 3x20m race weight. Upper: Rope Pull 3x20 + Row 3x10 heavy; Pull-ups + KB Swing 4x15; SkiErg 5x200m race pace; Rower 4x250m. Finisher: 1km run + immediately 30 wall balls (no rest — this IS the training).

PEAK: Race-specific. 30-45s rest between stations. Full circuit: SkiErg 500m → 30s → Sled Push 2x25m → 30s → Sled Pull 2x25m → 30s → Burpees 20 → 30s → Row 500m → 30s → Farmers 100m → 30s → Sandbag Lunge 50m → 30s → Wall Balls 50. Do 2-3 rounds with 3min between. Power session alternative: Trap Bar 4x4 heavy 3min rest; heavy farmers above race weight; heavy sled above race weight; wall ball velocity 4x15.

TAPER: 40% volume reduction, maintain weights, known movements only. One station practice round (all 8 at easy pace, mental rehearsal). One power maintenance (3 lifts x3 sets x4 reps).

MARATHON/RUNNING STRENGTH: Running economy only. No heavy bilateral lower body within 48h of long run. Priority: glute med, hip flexor, calf (single-leg raises 3x20), anti-rotation core. No heavy squats/deadlifts near run days. Mark stationTarget as "Running economy".

MIXED DOUBLES: Both partners do every station. Full-body capacity, not specialisation. Include transition practice notes in sessionCoachNote.

OUTPUT RULES:
- Return ONLY valid JSON. No markdown fences. No preamble. No explanation after the JSON.
- sessionCoachNote must be second-person direct coaching voice ("You're in week X of BUILD...").
- Every exercise MUST have a stationTarget field naming which HYROX station it serves.
- equipmentNeeded must list only what is actually used.
- estimatedDuration must be realistic (e.g. "45–55 min").`;

// ─── Strength content generator ───────────────────────────────────────────────

interface StrengthWorkoutInput {
  id: string;
  title: string;
  description: string;
  targetDuration: number | null;
  week: number;
  phase: string;
  weekInPhase?: number;
  totalPlanWeeks?: number;
  siblingWorkouts?: string; // titles of other workouts same week
}

async function generateStrengthContent(
  workout: StrengthWorkoutInput,
  eventType: string,
  gender?: string | null,
  isMixedDoubles?: boolean,
): Promise<unknown | null> {
  const isHyrox = eventType.startsWith("HYROX");
  const isMarathon = ["MARATHON", "HALF_MARATHON", "FIVE_K", "TEN_K", "ULTRA_50K", "ULTRA_50M"].includes(eventType);

  const genderNote = gender
    ? `Athlete gender: ${gender}. Use gender-specific HYROX weights where applicable.`
    : "Athlete gender unknown — list both Men/Women weights (e.g. 'Men 102kg / Women 72kg') for weighted stations.";

  const mixedNote = isMixedDoubles
    ? "EVENT FORMAT: Mixed Doubles — both partners complete every station. Emphasise full-body capacity, not specialisation. Include transition notes in sessionCoachNote."
    : "";

  const userPrompt = `Generate a structured strength workout as JSON only.

ATHLETE CONTEXT:
- Event: ${eventType}${isMixedDoubles ? " (Mixed Doubles)" : ""}
- Phase: ${workout.phase.toUpperCase()}
- Week ${workout.week} of plan${workout.totalPlanWeeks ? ` (${workout.totalPlanWeeks} total weeks)` : ""}
${workout.weekInPhase ? `- Week ${workout.weekInPhase} within this phase` : ""}
- ${genderNote}
${mixedNote}
${workout.siblingWorkouts ? `- Other workouts this week (avoid conflicting leg emphasis): ${workout.siblingWorkouts}` : ""}

SESSION:
- Title: ${workout.title}
- Description: ${workout.description}
- Target duration: ${workout.targetDuration ?? 45} minutes
- Sport context: ${isHyrox ? "HYROX — every exercise must serve one of the 8 stations or run prep" : isMarathon ? "Marathon/Running — running economy only" : "General fitness"}

Return ONLY this JSON structure (no markdown, no text before or after):
{
  "sessionName": "descriptive session name",
  "phaseContext": "one sentence on where this fits in the training arc",
  "estimatedDuration": "X–Y min",
  "equipmentNeeded": ["item1", "item2"],
  "sessionCoachNote": "2-3 sentence direct second-person coaching note",
  "warmup": "explicit 5-8 min warmup description",
  "blocks": [
    {
      "blockLabel": "block name (e.g. Lower Power, Station Simulation)",
      "exercises": [
        {
          "exercise": "Exercise name",
          "sets": 4,
          "reps": "6-8",
          "load": "load guidance",
          "tempo": "3-1-1-0",
          "rest": "60s",
          "stationTarget": "which HYROX station this serves (e.g. Sled Push, Wall Balls, Running economy)",
          "coachingCue": "one sentence focus cue"
        }
      ]
    }
  ],
  "finisher": "finisher description or null",
  "cooldown": "5 min cooldown description"
}`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: HYROX_STRENGTH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = parseClaudeJson(text) as Record<string, unknown> | null;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;
    return parsed;
  } catch (err) {
    console.error(`Strength generation failed for workout ${workout.id}:`, err);
    return null;
  }
}

// ─── Post-insert: enrichStrengthWorkouts (batched, fire-and-forget) ───────────

async function enrichStrengthWorkouts(
  planId: string,
  strengthWorkouts: Array<StrengthWorkoutInput>,
  eventType: string,
  gender?: string | null,
): Promise<void> {
  const isMixedDoubles =
    eventType.includes("MIXED") ||
    strengthWorkouts[0]?.title?.toLowerCase().includes("mixed");

  // Build a week→sibling titles map so we can pass sibling context to Claude
  const weekTitles = new Map<number, string[]>();
  for (const w of strengthWorkouts) {
    const arr = weekTitles.get(w.week) ?? [];
    arr.push(w.title);
    weekTitles.set(w.week, arr);
  }

  // Batch of 5 with 1s delay between batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < strengthWorkouts.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000));
    const batch = strengthWorkouts.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (w) => {
        const siblings = (weekTitles.get(w.week) ?? []).filter(t => t !== w.title);
        const enriched = await generateStrengthContent(
          { ...w, siblingWorkouts: siblings.length ? siblings.join(", ") : undefined },
          eventType,
          gender,
          isMixedDoubles,
        );
        if (!enriched) return;

        // Extract top-level fields for backward compat columns
        const parsed = enriched as Record<string, unknown>;
        const warmup = typeof parsed.warmup === "string" ? parsed.warmup : null;
        const cooldown = typeof parsed.cooldown === "string" ? parsed.cooldown : null;
        const coachingCues = typeof parsed.sessionCoachNote === "string" ? parsed.sessionCoachNote : null;

        await db.workout.update({
          where: { id: w.id },
          data: {
            strengthBlocks: enriched as object,
            warmup: warmup || null,
            cooldown: cooldown || null,
            coachingCues: coachingCues || null,
          },
        });
      })
    );
  }

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

  return NextResponse.json({ planId: plan.id, templateBase: templateKey, totalWeeks: builtPlan.totalWeeks });
}
