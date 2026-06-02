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

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return { monday, sunday };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { monday, sunday } = getWeekBounds();

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

  await db.weeklyCheckin.create({
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
  });

  return NextResponse.json({ aiResponse, completedCount, plannedCount: scheduledCount });
}
