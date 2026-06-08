import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/lib/ai/config";
import { parseClaudeJson } from "@/lib/ai/parseJson";

function differenceInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Threshold constants
const COMPLIANCE_THRESHOLD = 0.60;   // < 60% in last 14d triggers load reduction
const RECOVERY_THRESHOLD = 34;       // < 34% WHOOP average → recovery week
const RPE_HIGH_THRESHOLD = 8.5;      // avg RPE ≥ 8.5 → intensity shift down
const RPE_LOW_THRESHOLD = 5.0;       // avg RPE ≤ 5.0 → load increase candidate
const TSB_OVERREACH_THRESHOLD = -30; // TSB < -30 → recovery week
const ATL_CTL_RAMP_THRESHOLD = 1.5;  // ATL/CTL > 1.5 → ramp correction

type AdaptationType = "LOAD_REDUCTION" | "RECOVERY_WEEK" | "RAMP_CORRECTION" | "INTENSITY_SHIFT" | "LOAD_INCREASE";
type AdaptationSeverity = "LOW" | "MEDIUM" | "HIGH";

interface TriggerResult {
  fired: boolean;
  signal: string;
  detail: string;
}

interface EvaluationResult {
  triggers: TriggerResult[];
  adaptationType: AdaptationType | null;
  severity: AdaptationSeverity;
}

function getStartOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

async function evaluateThresholds(
  plan: { id: string; createdAt: Date; totalWeeks: number },
  userId: string
): Promise<EvaluationResult> {
  const now = new Date();
  const planAgeDays = differenceInDays(now, plan.createdAt);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [last14Workouts, whoopRecovery7d, athleteModel] = await Promise.all([
    db.workout.findMany({
      where: { planId: plan.id, scheduledDate: { gte: fourteenDaysAgo }, type: { not: "REST" } },
      select: { status: true },
    }),
    db.whoopRecovery.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      select: { recoveryScore: true },
      orderBy: { date: "desc" },
    }),
    db.athleteModel.findUnique({
      where: { userId },
      select: { tsb: true, ctl: true, atl: true, rpeAvg7d: true, rpeAvg28d: true, complianceRate28d: true },
    }),
  ]);

  const triggers: TriggerResult[] = [];

  // 1. Compliance threshold (skip if plan < 7 days old)
  if (planAgeDays >= 7 && last14Workouts.length >= 3) {
    const completed = last14Workouts.filter(w => w.status === "COMPLETED").length;
    const rate = completed / last14Workouts.length;
    triggers.push({
      fired: rate < COMPLIANCE_THRESHOLD,
      signal: "low_compliance",
      detail: `${Math.round(rate * 100)}% completion in last 14 days`,
    });
  }

  // 2. Recovery threshold
  if (whoopRecovery7d.length >= 3) {
    const avg = whoopRecovery7d.reduce((s, r) => s + r.recoveryScore, 0) / whoopRecovery7d.length;
    triggers.push({
      fired: avg < RECOVERY_THRESHOLD,
      signal: "low_recovery",
      detail: `Avg WHOOP recovery ${avg.toFixed(0)}% over last 7 days`,
    });
  }

  // 3. TSB overreach
  if (athleteModel?.tsb != null) {
    triggers.push({
      fired: athleteModel.tsb < TSB_OVERREACH_THRESHOLD,
      signal: "high_fatigue",
      detail: `TSB ${athleteModel.tsb.toFixed(1)} — significant accumulated fatigue`,
    });
  }

  // 4. ATL/CTL ramp rate
  if (athleteModel?.ctl != null && athleteModel?.atl != null && athleteModel.ctl > 0) {
    const ramp = athleteModel.atl / athleteModel.ctl;
    triggers.push({
      fired: ramp > ATL_CTL_RAMP_THRESHOLD,
      signal: "ramp_too_fast",
      detail: `ATL/CTL ratio ${ramp.toFixed(2)} — loading too fast`,
    });
  }

  // 5. RPE too hard
  if (athleteModel?.rpeAvg7d != null) {
    triggers.push({
      fired: athleteModel.rpeAvg7d >= RPE_HIGH_THRESHOLD,
      signal: "rpe_too_hard",
      detail: `7-day avg RPE ${athleteModel.rpeAvg7d.toFixed(1)} — workouts feel too hard`,
    });
  }

  // 6. RPE too easy (only paired with good compliance)
  if (athleteModel?.rpeAvg28d != null && athleteModel?.complianceRate28d != null) {
    triggers.push({
      fired: athleteModel.rpeAvg28d <= RPE_LOW_THRESHOLD && athleteModel.complianceRate28d >= 0.80,
      signal: "rpe_too_easy",
      detail: `28-day avg RPE ${athleteModel.rpeAvg28d.toFixed(1)} with ${Math.round(athleteModel.complianceRate28d * 100)}% compliance — ready for more load`,
    });
  }

  const fired = triggers.filter(t => t.fired);

  // Priority order: RECOVERY_WEEK > LOAD_REDUCTION > RAMP_CORRECTION > INTENSITY_SHIFT > LOAD_INCREASE
  let adaptationType: AdaptationType | null = null;

  const hasLowRecovery = fired.some(t => t.signal === "low_recovery");
  const hasHighFatigue = fired.some(t => t.signal === "high_fatigue");
  const hasLowCompliance = fired.some(t => t.signal === "low_compliance");
  const hasRampTooFast = fired.some(t => t.signal === "ramp_too_fast");
  const hasRpeTooHard = fired.some(t => t.signal === "rpe_too_hard");
  const hasRpeTooEasy = fired.some(t => t.signal === "rpe_too_easy");

  if (hasLowRecovery || hasHighFatigue) {
    adaptationType = "RECOVERY_WEEK";
  } else if (hasLowCompliance) {
    adaptationType = "LOAD_REDUCTION";
  } else if (hasRampTooFast) {
    adaptationType = "RAMP_CORRECTION";
  } else if (hasRpeTooHard) {
    adaptationType = "INTENSITY_SHIFT";
  } else if (hasRpeTooEasy) {
    adaptationType = "LOAD_INCREASE";
  }

  // Severity: HIGH = 2+ fired, MEDIUM = 1 strong signal, LOW = 1 weak
  const severity: AdaptationSeverity =
    fired.length >= 2 ? "HIGH" :
    fired.length === 1 && (hasLowRecovery || hasHighFatigue) ? "HIGH" :
    fired.length === 1 ? "MEDIUM" :
    "LOW";

  return { triggers, adaptationType, severity };
}

async function applyWorkoutModifications(
  planId: string,
  adaptationType: AdaptationType,
  weekRange: { from: number; to: number }
): Promise<number> {
  const now = new Date();
  // Compute the start of the week range relative to first workout in the plan
  const firstWorkout = await db.workout.findFirst({
    where: { planId },
    orderBy: { scheduledDate: "asc" },
    select: { scheduledDate: true },
  });
  if (!firstWorkout) return 0;

  const planStart = startOfWeek(firstWorkout.scheduledDate);
  const fromDate = new Date(planStart.getTime() + (weekRange.from - 1) * 7 * 86400000);
  const toDate = new Date(planStart.getTime() + weekRange.to * 7 * 86400000);

  // Only modify future workouts
  const futureFrom = fromDate > now ? fromDate : now;

  const HARD_TYPES = new Set(["LONG_RUN", "INTERVALS", "TEMPO", "HYROX_SIM", "RACE"]);

  const workouts = await db.workout.findMany({
    where: {
      planId,
      scheduledDate: { gte: futureFrom, lt: toDate },
      type: { not: "REST" },
    },
    select: { id: true, type: true, targetDistance: true, intensityZone: true, targetDuration: true },
  });

  let modified = 0;

  for (const w of workouts) {
    if (adaptationType === "RECOVERY_WEEK") {
      if (HARD_TYPES.has(w.type)) {
        const newDist = w.targetDistance ? Math.round(w.targetDistance * 0.7 * 10) / 10 : null;
        await db.workout.update({
          where: { id: w.id },
          data: {
            type: w.type === "INTERVALS" || w.type === "TEMPO" ? "EASY_RUN" : w.type,
            targetDistance: newDist,
            intensityZone: w.intensityZone != null ? Math.max(1, w.intensityZone - 1) : null,
            aiModified: true,
            aiModifyReason: "Recovery week — adapted by weekly plan review",
          },
        });
        modified++;
      }
    } else if (adaptationType === "LOAD_REDUCTION") {
      if (w.targetDistance != null && w.targetDistance > 0) {
        await db.workout.update({
          where: { id: w.id },
          data: {
            targetDistance: Math.round(w.targetDistance * 0.80 * 10) / 10,
            aiModified: true,
            aiModifyReason: "Load reduction — compliance below threshold",
          },
        });
        modified++;
      }
    } else if (adaptationType === "RAMP_CORRECTION") {
      if (HARD_TYPES.has(w.type) && w.targetDistance != null) {
        await db.workout.update({
          where: { id: w.id },
          data: {
            targetDistance: Math.round(w.targetDistance * 0.90 * 10) / 10,
            aiModified: true,
            aiModifyReason: "Ramp correction — acute load rising too fast",
          },
        });
        modified++;
      }
    } else if (adaptationType === "INTENSITY_SHIFT") {
      if (w.type === "INTERVALS" || w.type === "TEMPO") {
        await db.workout.update({
          where: { id: w.id },
          data: {
            type: "EASY_RUN",
            intensityZone: 2,
            aiModified: true,
            aiModifyReason: "Intensity shift — RPE trending too high",
          },
        });
        modified++;
      }
    } else if (adaptationType === "LOAD_INCREASE") {
      if (w.type === "EASY_RUN" || w.type === "LONG_RUN") {
        const newDist = w.targetDistance ? Math.round(w.targetDistance * 1.10 * 10) / 10 : null;
        await db.workout.update({
          where: { id: w.id },
          data: {
            targetDistance: newDist,
            aiModified: true,
            aiModifyReason: "Load increase — athlete responding well, ready for more",
          },
        });
        modified++;
      }
    }
  }

  return modified;
}

async function generateCoachMessages(
  athleteName: string,
  adaptationType: AdaptationType,
  severity: AdaptationSeverity,
  firedTriggers: TriggerResult[]
): Promise<{ coachSummary: string; coachMessage: string }> {
  const signalList = firedTriggers.map(t => `- ${t.detail}`).join("\n");

  const TYPE_LABELS: Record<AdaptationType, string> = {
    LOAD_REDUCTION: "load reduction",
    RECOVERY_WEEK: "recovery week",
    RAMP_CORRECTION: "ramp correction",
    INTENSITY_SHIFT: "intensity shift (backing off)",
    LOAD_INCREASE: "load increase",
  };

  const prompt = `You are an endurance coach writing a brief note about an automated plan adjustment.

ATHLETE: ${athleteName}
ADAPTATION: ${TYPE_LABELS[adaptationType]} (severity: ${severity.toLowerCase()})
SIGNALS THAT TRIGGERED THIS:
${signalList}

Write two things:
1. coachSummary: One sentence (internal, factual). State what signals fired and what was done.
2. coachMessage: Two sentences max, athlete-facing, direct tone. No fluff. Tell them what changed and why in plain language. Don't say "I noticed" — just state it.

Return ONLY valid JSON:
{"coachSummary": "...", "coachMessage": "..."}`;

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = parseClaudeJson(text) as { coachSummary?: string; coachMessage?: string } | null;
    if (parsed?.coachSummary && parsed?.coachMessage) {
      return { coachSummary: parsed.coachSummary, coachMessage: parsed.coachMessage };
    }
  } catch (err) {
    console.error("[adaptPlan] Claude message generation failed:", err);
  }

  // Fallback
  const fallbackMessages: Record<AdaptationType, string> = {
    LOAD_REDUCTION: "Your training volume has been reduced by 20% for the next two weeks — compliance has been below 60%, so we're matching load to what you're actually executing.",
    RECOVERY_WEEK: "This week has been converted to a recovery week — your recovery scores and fatigue levels indicate your body needs a reset before the next build.",
    RAMP_CORRECTION: "Hard session distances have been trimmed 10% — your acute load is rising faster than your chronic base can absorb.",
    INTENSITY_SHIFT: "Interval and tempo sessions have been swapped to easy runs this week — your RPE has been consistently high, so we're backing off intensity while keeping volume.",
    LOAD_INCREASE: "Easy run distances have been bumped 10% — your RPE is low and compliance is strong, so the plan is progressing accordingly.",
  };

  return {
    coachSummary: `${TYPE_LABELS[adaptationType]} applied based on: ${firedTriggers.map(t => t.signal).join(", ")}`,
    coachMessage: fallbackMessages[adaptationType],
  };
}

export async function adaptPlan(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) return;

  const activePlans = await db.trainingPlan.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true, createdAt: true, totalWeeks: true, currentWeek: true },
  });

  for (const plan of activePlans) {
    // IDEMPOTENCY CHECK — must be first, before any other queries
    const weekStart = getStartOfCurrentWeek();
    const existingAdaptation = await db.planAdaptation.findFirst({
      where: { planId: plan.id, appliedAt: { gte: weekStart } },
    });
    if (existingAdaptation) {
      console.log(`[adaptPlan] Already adapted plan ${plan.id} this week — skipping`);
      continue;
    }

    try {
      const evaluation = await evaluateThresholds(plan, userId);
      if (!evaluation.adaptationType) {
        console.log(`[adaptPlan] No thresholds triggered for plan ${plan.id}`);
        continue;
      }

      const firedTriggers = evaluation.triggers.filter(t => t.fired);
      const triggerSignals = firedTriggers.map(t => t.signal);

      // Apply modifications to next 2 weeks from now
      const weekRange = { from: plan.currentWeek, to: Math.min(plan.currentWeek + 1, plan.totalWeeks) };
      const workoutsModified = await applyWorkoutModifications(plan.id, evaluation.adaptationType, weekRange);

      const { coachSummary, coachMessage } = await generateCoachMessages(
        user.name?.split(" ")[0] ?? "Athlete",
        evaluation.adaptationType,
        evaluation.severity,
        firedTriggers
      );

      await db.planAdaptation.create({
        data: {
          userId,
          planId: plan.id,
          adaptationType: evaluation.adaptationType,
          severity: evaluation.severity,
          triggerSignals,
          weekRange,
          workoutsModified,
          coachSummary,
          coachMessage,
        },
      });

      console.log(`[adaptPlan] Applied ${evaluation.adaptationType} to plan ${plan.id} — ${workoutsModified} workouts modified`);
    } catch (err) {
      console.error(`[adaptPlan] Failed for plan ${plan.id}:`, err);
    }
  }
}
