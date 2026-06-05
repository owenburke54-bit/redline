import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { buildCoachSystemPrompt } from "@/lib/ai/coachPrompts";
import { CLAUDE_MODEL } from "@/lib/ai/config";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { formatWhoopContextForCoach } from "@/lib/whoop/sync";
import { formatGarminContextForCoach } from "@/lib/garmin/sync";
import { weeksUntil } from "@/lib/utils";
import { classScheduleSchema } from "@/lib/validation/schemas";
import { computeTrainingZones, buildStravaZoneContext } from "@/lib/strava/zones";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return { start: monday, end: sunday };
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
  const { messages = [], isInitial = false } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    isInitial: boolean;
  };

  const { start, end } = getWeekBounds();

  const whoopStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [user, profile, events, weekWorkouts, whoopActivities, todayRecovery, stravaRuns, whoopRunning, todayGarmin, recentWorkouts7, whoopTrend7, last14Workouts] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.athleteProfile.findUnique({ where: { userId } }),
    db.event.findMany({ where: { userId, isActive: true }, orderBy: { date: "asc" } }),
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: start, lt: end } },
      include: { plan: { include: { event: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
    db.whoopActivity.findMany({
      where: { userId, startDate: { gte: whoopStart }, sportName: { not: "Cycle" } },
      orderBy: { startDate: "desc" },
      select: { sportName: true, startDate: true, strain: true },
    }),
    db.whoopRecovery.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { recoveryScore: true, hrvRmssd: true, restingHr: true, sleepScore: true, sleepDuration: true },
    }),
    db.stravaActivity.findMany({
      where: { userId, type: { in: ["Run", "VirtualRun", "TrailRun"] } },
      select: { distance: true, movingTime: true, averageSpeed: true, averageHeartrate: true, maxHeartrate: true, startDate: true },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
    db.whoopActivity.findMany({
      where: { userId, sportName: "Running" },
      select: { startDate: true, avgHeartRate: true, maxHeartRate: true },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
    db.garminDailySummary.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { bodyBattery: true, stressAvg: true, restingHr: true, sleepScore: true, sleepDuration: true, sleepHrv: true },
    }),
    // Last 7 days of workouts with logging data
    db.workout.findMany({
      where: {
        userId,
        scheduledDate: { gte: new Date(Date.now() - 7 * 86400000) },
        type: { not: "REST" },
      },
      orderBy: { scheduledDate: "asc" },
      select: {
        type: true, title: true, scheduledDate: true,
        targetDistance: true, actualDistance: true,
        perceivedEffort: true, perceivedDifficulty: true,
        status: true, description: true, coachingCues: true,
      },
    }),
    // Last 7 days WHOOP recovery trend
    db.whoopRecovery.findMany({
      where: { userId, date: { gte: new Date(Date.now() - 7 * 86400000) } },
      orderBy: { date: "asc" },
      select: { date: true, recoveryScore: true, hrvRmssd: true },
    }),
    // Last 14 days workouts for compliance
    db.workout.findMany({
      where: {
        userId,
        scheduledDate: { gte: new Date(Date.now() - 14 * 86400000) },
        type: { not: "REST" },
      },
      select: { status: true },
    }),
  ]);

  const profileParts = [
    profile?.yearsRunning != null ? `${profile.yearsRunning} years running` : null,
    profile?.weeklyMileageBaseline != null ? `${profile.weeklyMileageBaseline} miles/week baseline` : null,
    profile?.injuryHistory ? `Injury history: ${profile.injuryHistory}` : null,
    profile?.goalStatement ? `Goal: ${profile.goalStatement}` : null,
    profile?.painToleranceRating != null ? `Pain tolerance: ${profile.painToleranceRating}/10` : null,
  ].filter(Boolean);
  const profileSummary = profileParts.length > 0 ? profileParts.join(". ") : "Profile incomplete — ask the athlete.";

  const activeEvents = events.map(e => ({
    name: e.name,
    type: e.type,
    date: e.date.toLocaleDateString("en-US"),
    weeksOut: weeksUntil(e.date),
    goalTime: e.goalTime,
  }));

  const weekWorkoutsSummary = weekWorkouts.length > 0
    ? weekWorkouts.map(w => `${DAY_NAMES[w.scheduledDate.getDay()]}: ${w.title} (${w.status.toLowerCase()})`).join(", ")
    : "No workouts scheduled this week";

  const whoopConnected = !!(user?.whoopAccessToken && user?.whoopId);
  const garminConnected = !!(user?.garminAccessToken && user?.garminUserId);
  const stravaConnected = !!(user?.stravaAccessToken && user?.stravaId);

  const rawWhoopContext = formatWhoopContextForCoach(whoopActivities, todayRecovery);
  const whoopContext = rawWhoopContext !== "No WHOOP data available"
    ? rawWhoopContext
    : whoopConnected
    ? "WHOOP connected — no recovery data synced yet (posts each morning after sleep)"
    : "WHOOP not connected";

  const rawGarminContext = formatGarminContextForCoach(todayGarmin ?? null);
  const garminContext = garminConnected
    ? rawGarminContext
    : null;

  // Combine wearable context: prefer whichever has data
  const wearableContext = [
    whoopConnected ? whoopContext : null,
    garminContext,
  ].filter(Boolean).join("\n---\n") || "No wearable connected";

  const zones = computeTrainingZones(stravaRuns, whoopRunning);
  const stravaZoneContext = stravaConnected
    ? buildStravaZoneContext(zones, todayRecovery?.recoveryScore ?? null)
    : undefined;

  // Build recentTraining for coach context
  const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const completed14 = last14Workouts.filter(w => w.status === "COMPLETED").length;
  const compliancePct = last14Workouts.length > 0 ? Math.round((completed14 / last14Workouts.length) * 100) : 0;

  const flaggedSessions: string[] = [];
  const tooEasyCount = recentWorkouts7.filter(w => w.perceivedDifficulty === "TOO_EASY").length;

  const completedWorkouts7 = recentWorkouts7.map(w => {
    const dayLabel = WEEKDAY_SHORT[w.scheduledDate.getDay()];
    const typeLabel = w.type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Flag skipped with no note
    if (w.status === "SKIPPED" && !w.description) {
      flaggedSessions.push(`${dayLabel} ${typeLabel} skipped with no explanation`);
    }
    // Flag too hard + high RPE
    if (w.perceivedDifficulty === "TOO_HARD" && w.perceivedEffort != null && w.perceivedEffort >= 8) {
      flaggedSessions.push(`${dayLabel} ${typeLabel} felt too hard (RPE ${w.perceivedEffort})`);
    }

    return {
      date: w.scheduledDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      type: typeLabel,
      plannedDistance: w.targetDistance,
      actualDistance: w.actualDistance,
      rpe: w.perceivedEffort,
      perceivedDifficulty: w.perceivedDifficulty as string | null,
      status: w.status,
      hasNote: !!(w.description && w.description.trim().length > 0),
      coachingCues: w.coachingCues,
    };
  });

  if (tooEasyCount >= 3) {
    flaggedSessions.push(`${tooEasyCount} sessions felt too easy — consider increasing load`);
  }

  const whoopTrend = whoopTrend7.map(r => ({
    date: r.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    score: Math.round(r.recoveryScore),
    hrv: r.hrvRmssd,
  }));

  const recentTraining = {
    completedWorkouts: completedWorkouts7,
    compliancePct,
    flaggedSessions,
    whoopTrend,
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "America/New_York",
  });

  const systemPrompt = buildCoachSystemPrompt({
    athleteName: user?.name?.split(" ")[0] ?? "Athlete",
    dedicationScore: user?.dedicationScore ?? 7,
    profileSummary,
    activeEvents,
    currentDate,
    currentWeekWorkouts: weekWorkoutsSummary,
    recentActivity: stravaConnected
      ? zones.runCount > 0
        ? `${zones.runCount} runs in Strava (avg ${zones.avgWeeklyMiles} mi/wk over last 4 weeks)`
        : "Strava connected — no runs synced yet."
      : "Strava not connected.",
    whoopContext: wearableContext,
    stravaZoneContext,
    activeConflicts: [],
    classSchedule: (() => {
      const r = classScheduleSchema.safeParse(profile?.classSchedule);
      return r.success ? r.data : null;
    })(),
    recentTraining,
  });

  const conversationMessages: { role: "user" | "assistant"; content: string }[] = isInitial
    ? [{
        role: "user",
        content: `You are meeting this athlete for the first time. Acknowledge their specific upcoming events (${activeEvents.map(e => `${e.name} in ${e.weeksOut} weeks${e.goalTime ? ` targeting ${e.goalTime}` : ""}`).join(", ")}). ${whoopActivities.length > 0 ? "You can see their WHOOP data — acknowledge any other training you notice. " : ""}Ask 1 targeted question about what their strength training currently looks like. Be direct and conversational. Under 80 words. No bullet points.`,
      }]
    : messages;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: conversationMessages,
        });

        for await (const chunk of anthropicStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
