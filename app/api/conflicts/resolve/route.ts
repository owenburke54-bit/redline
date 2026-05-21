import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HARD_SESSIONS = new Set(["LONG_RUN", "INTERVALS", "TEMPO", "RACE", "HYROX_SIM"]);

type WorkoutSnap = {
  id: string;
  planId: string;
  planName: string;
  type: string;
  title: string;
  date: string;
  targetDistance: number | null;
};

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const plans = await db.trainingPlan.findMany({
    where: { userId },
    include: {
      event: { select: { name: true } },
      workouts: {
        orderBy: { scheduledDate: "asc" },
        select: { id: true, type: true, title: true, scheduledDate: true, targetDistance: true },
      },
    },
  });

  if (plans.length < 2) {
    return NextResponse.json({ conflicts: 0, summary: "Only one plan — no cross-plan conflicts possible." });
  }

  const allWorkouts: WorkoutSnap[] = plans.flatMap(p =>
    p.workouts
      .filter(w => w.type !== "REST")
      .map(w => ({
        id: w.id,
        planId: p.id,
        planName: p.event.name,
        type: w.type,
        title: w.title,
        date: w.scheduledDate.toISOString().split("T")[0],
        targetDistance: w.targetDistance,
      }))
  );

  const byDate = new Map<string, WorkoutSnap[]>();
  for (const w of allWorkouts) {
    if (!byDate.has(w.date)) byDate.set(w.date, []);
    byDate.get(w.date)!.push(w);
  }

  type Conflict = { type: "same_day" | "adjacent"; a: WorkoutSnap; b: WorkoutSnap };
  const conflicts: Conflict[] = [];
  const seen = new Set<string>();

  for (const [date, workouts] of byDate) {
    // Same-day conflicts: workouts from different plans, at least one hard
    const planIds = new Set(workouts.map(w => w.planId));
    if (planIds.size > 1) {
      for (let i = 0; i < workouts.length; i++) {
        for (let j = i + 1; j < workouts.length; j++) {
          const a = workouts[i], b = workouts[j];
          if (a.planId !== b.planId && (HARD_SESSIONS.has(a.type) || HARD_SESSIONS.has(b.type))) {
            const key = [a.id, b.id].sort().join(":");
            if (!seen.has(key)) { seen.add(key); conflicts.push({ type: "same_day", a, b }); }
          }
        }
      }
    }

    // Adjacent-day conflicts: hard sessions from different plans 1 day apart
    const d = new Date(date + "T12:00:00Z");
    const nextDate = new Date(d.getTime() + 86400000).toISOString().split("T")[0];
    const nextWorkouts = byDate.get(nextDate) ?? [];
    const hardToday = workouts.filter(w => HARD_SESSIONS.has(w.type));
    const hardNext = nextWorkouts.filter(w => HARD_SESSIONS.has(w.type));
    for (const a of hardToday) {
      for (const b of hardNext) {
        if (a.planId !== b.planId) {
          const key = [a.id, b.id].sort().join(":");
          if (!seen.has(key)) { seen.add(key); conflicts.push({ type: "adjacent", a, b }); }
        }
      }
    }
  }

  if (conflicts.length === 0) {
    return NextResponse.json({ conflicts: 0, summary: "No scheduling conflicts detected between your plans." });
  }

  const conflictLines = conflicts.map((c, i) => {
    const label = c.type === "same_day" ? "Same day" : "Back-to-back days";
    return `Conflict ${i + 1} (${label}):
  A: [${c.a.id}] ${c.a.planName} — ${c.a.type} "${c.a.title}" on ${c.a.date}${c.a.targetDistance ? ` (${c.a.targetDistance}mi)` : ""}
  B: [${c.b.id}] ${c.b.planName} — ${c.b.type} "${c.b.title}" on ${c.b.date}${c.b.targetDistance ? ` (${c.b.targetDistance}mi)` : ""}`;
  }).join("\n\n");

  const prompt = `You are resolving training schedule conflicts for an athlete running multiple plans simultaneously.

${conflictLines}

Resolution rules:
- Preserve RACE and marathon LONG_RUN sessions
- HYROX station work or strength on the same day as a marathon LONG_RUN: REMOVE the station/strength session
- Easy runs or HYROX easy runs adjacent to a marathon LONG_RUN: REMOVE if > 4mi, REDUCE to 3mi if ≤ 4mi
- Back-to-back HARD sessions from different plans: REMOVE the lower-priority one (keep marathon LONG_RUN > HYROX runs > intervals)
- Skip minor conflicts (e.g. easy runs ≤ 3mi adjacent to moderate sessions)

Return ONLY valid JSON:
{
  "summary": "One sentence describing what was fixed",
  "actions": [
    { "action": "REMOVE", "workoutId": "cuid-here" },
    { "action": "REDUCE", "workoutId": "cuid-here", "newDistance": 3 }
  ]
}`;

  let aiResponse: { summary: string; actions: Array<{ action: string; workoutId: string; newDistance?: number }> } | null = null;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) aiResponse = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: "AI conflict resolution failed" }, { status: 500 });
  }

  if (!aiResponse) {
    return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
  }

  const validIds = new Set(allWorkouts.map(w => w.id));
  const validActions = aiResponse.actions.filter(a => validIds.has(a.workoutId));

  const removes = validActions.filter(a => a.action === "REMOVE").map(a => a.workoutId);
  const reduces = validActions.filter(a => a.action === "REDUCE" && a.newDistance != null);

  await db.$transaction(async (tx) => {
    if (removes.length > 0) {
      await tx.workout.deleteMany({ where: { id: { in: removes } } });
    }
    for (const r of reduces) {
      await tx.workout.update({
        where: { id: r.workoutId },
        data: { targetDistance: r.newDistance! },
      });
    }
  });

  return NextResponse.json({
    conflicts: conflicts.length,
    resolved: validActions.length,
    summary: aiResponse.summary,
  });
}
