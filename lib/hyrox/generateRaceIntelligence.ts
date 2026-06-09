import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/lib/ai/config";
import { computeStationReadiness } from "./computeHyroxReadiness";
import { HYROX_STATION_ORDER, HYROX_STATION_LABELS, TARGET_SPLITS_115 } from "./constants";
import type { HyroxStation } from "./constants";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface StationAdviceItem {
  station: string;
  advice: string[];
}

interface WeaknessIntervention {
  weakness: string;
  interventions: string[];
}

interface IntelligencePayload {
  stationAdvice: StationAdviceItem[];
  raceDayBrief: string;
  partnerNotes: string | null;
  weaknessInterventions: WeaknessIntervention[];
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildIntelligencePrompt(params: {
  athleteName: string;
  eventName: string;
  eventType: string;
  daysUntilRace: number;
  stationScores: Record<HyroxStation, number>;
  weakestStations: HyroxStation[];
  ctlEstimate: number | null;
  recentWorkoutCount: number;
}): string {
  const { athleteName, eventName, eventType, daysUntilRace, stationScores, weakestStations, ctlEstimate, recentWorkoutCount } = params;
  const isDoubles = eventType.includes("DOUBLES");

  const stationSummary = HYROX_STATION_ORDER.map(st => {
    const score = stationScores[st];
    const target = TARGET_SPLITS_115[st];
    const label = score >= 75 ? "STRONG" : score >= 50 ? "DEVELOPING" : "NEEDS WORK";
    return `- ${HYROX_STATION_LABELS[st]}: ${score}/100 (${label}, target ${target.label})`;
  }).join("\n");

  const weaknessLine = weakestStations.length > 0
    ? `Priority gaps: ${weakestStations.map(s => HYROX_STATION_LABELS[s]).join(", ")}`
    : "";

  return `You are a HYROX specialist coach generating a weekly race intelligence report for an athlete.

ATHLETE: ${athleteName}
EVENT: ${eventName} (${isDoubles ? "Mixed Doubles" : "Open"})
DAYS TO RACE: ${daysUntilRace}
${ctlEstimate != null ? `AEROBIC BASE (CTL): ${ctlEstimate.toFixed(1)}` : ""}
RECENT STATION SESSIONS: ${recentWorkoutCount}

STATION READINESS (0-100):
${stationSummary}
${weaknessLine}

Generate a weekly HYROX intelligence briefing. Return ONLY valid JSON with this exact structure:

{
  "stationAdvice": [
    {
      "station": "<STATION_KEY>",
      "advice": ["<one actionable tip>", "<one technique cue>"]
    }
  ],
  "raceDayBrief": "<2-3 sentence race strategy brief — be specific about pacing, station execution, energy management. Target: sub-1:15 Mixed Doubles finish.>",
  "partnerNotes": ${isDoubles ? '"<1-2 sentences about doubles strategy — which stations to prioritize splitting, how to manage transitions>"' : 'null'},
  "weaknessInterventions": [
    {
      "weakness": "<station label>",
      "interventions": ["<specific training intervention>", "<movement cue or drill>"]
    }
  ]
}

Requirements:
- stationAdvice: include all 8 stations
- Station keys must be exact: SKI_ERG, SLED_PUSH, SLED_PULL, BURPEE_BROAD_JUMP, ROW_ERG, FARMERS_CARRY, SANDBAG_LUNGE, WALL_BALLS
- weaknessInterventions: only for stations scoring under 60
- All advice must be specific, actionable, and phase-appropriate for ${daysUntilRace} days out
- If days out > 42, focus on strength building. If 14-42, race-specific conditioning. If < 14, race simulation and taper.
- No generic tips. Every tip must be tied to the specific station score or proximity to race.
- Return ONLY the JSON object. No explanation outside it.`;
}

async function generateForUser(userId: string): Promise<void> {
  const weekStart = getWeekStart();

  // Idempotency check
  const existing = await db.hyroxIntelligence.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
  if (existing) return;

  const d42 = new Date();
  d42.setDate(d42.getDate() - 42);

  const [event, athleteModel, recentWorkouts, user] = await Promise.all([
    db.event.findFirst({
      where: {
        userId,
        isActive: true,
        type: { in: ["HYROX", "HYROX_WOMENS", "HYROX_DOUBLES", "HYROX_DOUBLES_MIXED", "HYROX_DOUBLES_MENS", "HYROX_DOUBLES_WOMENS"] },
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
      select: { name: true, type: true, date: true },
    }),
    db.athleteModel.findUnique({
      where: { userId },
      select: { ctl: true, complianceRate28d: true },
    }),
    db.workout.findMany({
      where: {
        userId,
        type: { in: ["HYROX_STATION_WORK", "HYROX_SIM", "STRENGTH"] },
        scheduledDate: { gte: d42 },
      },
      select: { status: true, type: true, title: true, description: true, perceivedEffort: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  if (!event || !user) return;

  const stationReadiness = computeStationReadiness({
    ctl: athleteModel?.ctl ?? null,
    complianceRate28d: athleteModel?.complianceRate28d ?? null,
    recentWorkouts,
  });

  const stationScores = {} as Record<HyroxStation, number>;
  for (const st of HYROX_STATION_ORDER) {
    stationScores[st] = stationReadiness[st].score;
  }

  const weakestStations = [...HYROX_STATION_ORDER]
    .sort((a, b) => stationScores[a] - stationScores[b])
    .filter(st => stationScores[st] < 60)
    .slice(0, 3);

  const daysUntilRace = Math.max(
    0,
    Math.round((event.date.getTime() - Date.now()) / 86400000)
  );

  const stationWorkoutCount = recentWorkouts.filter(
    w => w.type === "HYROX_STATION_WORK" || w.type === "HYROX_SIM"
  ).length;

  const prompt = buildIntelligencePrompt({
    athleteName: user.name?.split(" ")[0] ?? "Athlete",
    eventName: event.name,
    eventType: event.type,
    daysUntilRace,
    stationScores,
    weakestStations,
    ctlEstimate: athleteModel?.ctl ?? null,
    recentWorkoutCount: stationWorkoutCount,
  });

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : null;
  if (!text) return;

  let payload: IntelligencePayload;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    payload = JSON.parse(jsonMatch ? jsonMatch[0] : text) as IntelligencePayload;
  } catch {
    return;
  }

  await db.hyroxIntelligence.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: {
      userId,
      weekStart,
      stationAdvice: payload.stationAdvice as object[],
      raceDayBrief: payload.raceDayBrief,
      partnerNotes: payload.partnerNotes ?? null,
      weaknessInterventions: payload.weaknessInterventions as object[],
      generatedAt: new Date(),
    },
    update: {
      stationAdvice: payload.stationAdvice as object[],
      raceDayBrief: payload.raceDayBrief,
      partnerNotes: payload.partnerNotes ?? null,
      weaknessInterventions: payload.weaknessInterventions as object[],
      generatedAt: new Date(),
    },
  });
}

export async function generateRaceIntelligenceForAllUsers(): Promise<{ processed: number; skipped: number; errors: number }> {
  const users = await db.user.findMany({
    where: {
      events: {
        some: {
          isActive: true,
          type: { in: ["HYROX", "HYROX_WOMENS", "HYROX_DOUBLES", "HYROX_DOUBLES_MIXED", "HYROX_DOUBLES_MENS", "HYROX_DOUBLES_WOMENS"] },
          date: { gte: new Date() },
        },
      },
    },
    select: { id: true },
  });

  let processed = 0, skipped = 0, errors = 0;

  for (const user of users) {
    try {
      const weekStart = getWeekStart();
      const existing = await db.hyroxIntelligence.findUnique({
        where: { userId_weekStart: { userId: user.id, weekStart } },
      });
      if (existing) { skipped++; continue; }
      await generateForUser(user.id);
      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, skipped, errors };
}
