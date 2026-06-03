import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/lib/ai/config";


const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Returns the Monday of the current UTC week as a Date (time = 00:00:00 UTC) */
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const weekStart = getCurrentWeekMonday();
  const brief = await db.weeklyBrief.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    select: { content: true },
  });

  return NextResponse.json({ content: brief?.content ?? null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  // Accept optional userId override from cron (passed in body)
  let targetUserId = userId;
  const body = await req.json().catch(() => ({})) as { userId?: string };
  // Only allow cron to override userId
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (body.userId && authHeader === `Bearer ${cronSecret}`) {
    targetUserId = body.userId;
  }

  const weekStart = getCurrentWeekMonday();

  // Return cached brief if already generated this week
  const existing = await db.weeklyBrief.findUnique({
    where: { userId_weekStart: { userId: targetUserId, weekStart } },
    select: { content: true },
  });
  if (existing) return NextResponse.json({ content: existing.content });

  // Fetch context
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000);

  const [user, thisWeekWorkouts, recentWhoop, last14Workouts, events] = await Promise.all([
    db.user.findUnique({ where: { id: targetUserId }, select: { name: true } }),
    db.workout.findMany({
      where: { userId: targetUserId, scheduledDate: { gte: weekStart, lt: weekEnd }, type: { not: "REST" } },
      orderBy: { scheduledDate: "asc" },
      select: { scheduledDate: true, type: true, title: true, targetDistance: true },
    }),
    db.whoopRecovery.findMany({
      where: { userId: targetUserId, date: { gte: threeDaysAgo } },
      orderBy: { date: "desc" },
      select: { recoveryScore: true, date: true },
      take: 3,
    }),
    db.workout.findMany({
      where: { userId: targetUserId, scheduledDate: { gte: fourteenDaysAgo }, type: { not: "REST" } },
      select: { status: true },
    }),
    db.event.findMany({
      where: { userId: targetUserId, isActive: true },
      orderBy: { date: "asc" },
      take: 1,
    }),
  ]);

  const athleteName = user?.name?.split(" ")[0] ?? "Athlete";
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const workoutList = thisWeekWorkouts.length > 0
    ? thisWeekWorkouts.map(w => {
        const day = DAY_NAMES[w.scheduledDate.getUTCDay()];
        const dist = w.targetDistance ? ` (${w.targetDistance}mi)` : "";
        return `${day}: ${w.title}${dist}`;
      }).join(", ")
    : "No workouts scheduled this week";

  const recoveryList = recentWhoop.length > 0
    ? recentWhoop.map(r => `${Math.round(r.recoveryScore)}%`).join(", ")
    : "no data";

  const completed14 = last14Workouts.filter(w => w.status === "COMPLETED").length;
  const compliancePct = last14Workouts.length > 0
    ? Math.round((completed14 / last14Workouts.length) * 100)
    : 0;

  const nextEvent = events[0];
  const daysOut = nextEvent ? Math.ceil((nextEvent.date.getTime() - Date.now()) / 86400000) : null;
  const eventLine = nextEvent && daysOut != null
    ? `${nextEvent.name}, ${daysOut} days out`
    : "No upcoming events";

  const prompt = `You are a direct coach. Write 2-3 sentences summarizing this athlete's week ahead.
No bullet points, no markdown, no headers. Speak directly to the athlete.
Tone: confident, specific, brief. Example: "Big week ahead — tempo Tuesday, long run Saturday, and station work Wednesday. Your recovery has been solid so don't hold back on the tempo effort. 129 days to HYROX Boston."

ATHLETE: ${athleteName}
THIS WEEK: ${workoutList}
RECENT RECOVERY: ${recoveryList}
COMPLIANCE LAST 2 WEEKS: ${compliancePct}%
NEXT EVENT: ${eventLine}`;

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  // Upsert brief
  await db.weeklyBrief.upsert({
    where: { userId_weekStart: { userId: targetUserId, weekStart } },
    create: { userId: targetUserId, weekStart, content },
    update: { content },
  });

  return NextResponse.json({ content });
}
