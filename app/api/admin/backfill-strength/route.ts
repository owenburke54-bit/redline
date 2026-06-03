import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/lib/ai/config";
import { parseClaudeJson } from "@/lib/ai/parseJson";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── HYROX strength system prompt (copied from plans/generate) ────────────────

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

OUTPUT RULES:
- Return ONLY valid JSON. No markdown fences. No preamble. No explanation after the JSON.
- sessionCoachNote must be second-person direct coaching voice.
- Every exercise MUST have a stationTarget field.
- equipmentNeeded must list only what is actually used.
- estimatedDuration must be realistic (e.g. "45–55 min").`;

// ─── Single workout enrichment ────────────────────────────────────────────────

async function enrichOne(
  workout: { id: string; title: string; description: string; targetDuration: number | null },
  phase: string,
  eventType: string,
  week: number,
  totalWeeks: number,
): Promise<unknown | null> {
  const userPrompt = `Generate a structured strength workout as JSON only.

ATHLETE CONTEXT:
- Event: ${eventType}
- Phase: ${phase.toUpperCase()}
- Week ${week} of plan (${totalWeeks} total weeks)

SESSION:
- Title: ${workout.title}
- Description: ${workout.description}
- Target duration: ${workout.targetDuration ?? 45} minutes

Return ONLY this JSON structure (no markdown, no text before or after):
{
  "sessionName": "descriptive session name",
  "phaseContext": "one sentence on where this fits in the training arc",
  "estimatedDuration": "X–Y min",
  "equipmentNeeded": ["item1"],
  "sessionCoachNote": "2-3 sentence direct second-person coaching note",
  "warmup": "explicit 5-8 min warmup description",
  "blocks": [
    {
      "blockLabel": "block name",
      "exercises": [
        {
          "exercise": "Exercise name",
          "sets": 4,
          "reps": "6-8",
          "load": "load guidance",
          "tempo": "3-1-1-0",
          "rest": "60s",
          "stationTarget": "which HYROX station this serves",
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
  } catch {
    return null;
  }
}

// ─── GET /api/admin/backfill-strength ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth: require CRON_SECRET bearer token
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find workouts that need enrichment (strengthBlocks IS NULL)
  // Note: we fetch all strength workouts and filter by null strengthBlocks in memory
  // to avoid Prisma JSON null filter type complexity.
  const rawWorkouts = await db.workout.findMany({
    where: {
      type: { in: ["STRENGTH", "HYROX_STATION_WORK"] },
    },
    select: {
      id: true,
      title: true,
      description: true,
      targetDuration: true,
      planId: true,
      strengthBlocks: true,
    },
  });

  // Filter to only those with null strengthBlocks
  const unprocessed = rawWorkouts.filter(w => w.strengthBlocks === null);

  // Fetch plan context separately
  const planIds = [...new Set(unprocessed.map(w => w.planId))];
  const plans = await db.trainingPlan.findMany({
    where: { id: { in: planIds } },
    select: {
      id: true,
      totalWeeks: true,
      weeklyStructure: true,
      event: { select: { type: true } },
    },
  });
  const planMap = new Map(plans.map(p => [p.id, p]));

  const workouts = unprocessed.map(w => ({ ...w, planData: planMap.get(w.planId) }));

  if (workouts.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, errors: [] });
  }

  const BATCH_SIZE = 5;
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < workouts.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000));
    const batch = workouts.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (w) => {
        try {
          const planData = w.planData;
          if (!planData) {
            failed++;
            errors.push(`${w.id}: plan not found`);
            return;
          }
          // Determine phase/week from weeklyStructure JSON
          const weeks = Array.isArray(planData.weeklyStructure) ? planData.weeklyStructure as Array<{ phase?: string }> : [];
          const phase = weeks[0]?.phase ?? "Base";
          const weekNum = 1;
          const totalWeeks = planData.totalWeeks;
          const eventType = planData.event.type as string;

          const enriched = await enrichOne(
            { id: w.id, title: w.title, description: w.description, targetDuration: w.targetDuration },
            phase,
            eventType,
            weekNum,
            totalWeeks,
          );

          if (!enriched) {
            failed++;
            errors.push(`${w.id}: no valid JSON returned`);
            return;
          }

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
          succeeded++;
        } catch (err) {
          failed++;
          errors.push(`${w.id}: ${String(err)}`);
        }
      })
    );
  }

  return NextResponse.json({
    processed: workouts.length,
    succeeded,
    failed,
    errors,
  });
}
