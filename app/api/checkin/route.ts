import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/lib/ai/config";
import { z } from "zod";

const schema = z.object({
  perceivedEffort: z.number().min(1).max(10),
  bodyFeel: z.number().min(1).max(10),
  notes: z.string().max(500).optional(),
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getWeekBounds(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return { monday, sunday };
}

const RUN_WORKOUT_TYPES = new Set(["EASY_RUN", "LONG_RUN", "TEMPO", "INTERVALS", "RACE"]);

async function adjustNextWeek(
  userId: string,
  perceivedEffort: number,
  bodyFeel: number
): Promise<void> {
  const shouldReduce = bodyFeel <= 3 || perceivedEffort >= 9;
  const shouldIncrease = bodyFeel >= 9 && perceivedEffort <= 4;

  if (!shouldReduce && !shouldIncrease) return;

  const { monday, sunday } = getWeekBounds(1);

  const nextWeekWorkouts = await db.workout.findMany({
    where: {
      userId,
      scheduledDate: { gte: monday, lt: sunday },
      status: "SCHEDULED",
      targetDistance: { not: null },
    },
    select: { id: true, type: true, targetDistance: true },
  });

  const updates = nextWeekWorkouts
    .filter(w => RUN_WORKOUT_TYPES.has(w.type))
    .map(w => {
      const current = w.targetDistance!;
      let adjusted: number;
      if (shouldReduce) {
        adjusted = Math.round(current * 0.85 * 10) / 10;
      } else {
        // Only increase easy runs, not tempo/intervals/long
        if (w.type !== "EASY_RUN") return null;
        adjusted = Math.round(current * 1.1 * 10) / 10;
      }
      if (adjusted === current) return null;
      return db.workout.update({
        where: { id: w.id },
        data: { targetDistance: adjusted },
      });
    })
    .filter(Boolean);

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { monday, sunday } = getWeekBounds(0);

  const [weekWorkouts, user, events] = await Promise.all([
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: monday, lt: sunday } },
      select: { status: true, type: true, title: true, targetDistance: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { name: true, dedicationScore: true } }),
    db.event.findMany({
      where: { userId, isActive: true },
      orderBy: { date: "asc" },
      select: { name: true, type: true, date: true },
    }),
  ]);

  const scheduledCount = weekWorkouts.filter(w => w.type !== "REST").length;
  const completedCount = weekWorkouts.filter(w => w.status === "COMPLETED").length;
  const skippedCount = weekWorkouts.filter(w => w.status === "SKIPPED").length;
  const completionRate = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

  const completedWorkouts = weekWorkouts
    .filter(w => w.status === "COMPLETED")
    .map(w => `${w.title}${w.targetDistance ? ` (${w.targetDistance}mi)` : ""}`)
    .join(", ");

  const prompt = `You are a direct, experienced endurance coach doing a quick weekly check-in with ${user?.name?.split(" ")[0] ?? "the athlete"}.

WEEK SUMMARY:
- Completed ${completedCount}/${scheduledCount} scheduled sessions (${completionRate}%)
- Skipped: ${skippedCount}
- Completed: ${completedWorkouts || "none logged"}

ATHLETE'S SELF-REPORT:
- Perceived effort this week: ${parsed.data.perceivedEffort}/10
- Body feel: ${parsed.data.bodyFeel}/10
- Notes: ${parsed.data.notes || "none"}

UPCOMING EVENTS:
${events.map(e => {
  const daysOut = Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000);
  return `- ${e.name} in ${daysOut} days`;
}).join("\n")}

Write a coach response (under 80 words). Acknowledge the week honestly. If they crushed it, say so. If they fell short, address it directly without softening. Give one specific thing to focus on next week based on their effort score, body feel, and what's coming up. No bullet points. Direct.`;

  let aiResponse = "";
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });
    aiResponse = message.content[0].type === "text" ? message.content[0].text : "";
  } catch {
    aiResponse = "Check-in saved. Keep consistent this week.";
  }

  await Promise.all([
    db.weeklyCheckin.create({
      data: {
        userId,
        weekOf: monday,
        perceivedEffort: parsed.data.perceivedEffort,
        bodyFeel: parsed.data.bodyFeel,
        completedCount,
        plannedCount: scheduledCount,
        notes: parsed.data.notes ?? null,
        aiResponse,
      },
    }),
    adjustNextWeek(userId, parsed.data.perceivedEffort, parsed.data.bodyFeel),
  ]);

  return NextResponse.json({ aiResponse, completedCount, plannedCount: scheduledCount });
}
