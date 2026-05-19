import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { buildCoachSystemPrompt } from "@/lib/ai/coachPrompts";
import { weeksUntil } from "@/lib/utils";

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
  const body = await req.json();
  const { messages = [], isInitial = false } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    isInitial: boolean;
  };

  const { start, end } = getWeekBounds();

  const [user, profile, events, weekWorkouts] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.athleteProfile.findUnique({ where: { userId } }),
    db.event.findMany({ where: { userId, isActive: true }, orderBy: { date: "asc" } }),
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: start, lt: end } },
      include: { plan: { include: { event: true } } },
      orderBy: { scheduledDate: "asc" },
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

  const systemPrompt = buildCoachSystemPrompt({
    athleteName: user?.name?.split(" ")[0] ?? "Athlete",
    dedicationScore: user?.dedicationScore ?? 7,
    profileSummary,
    activeEvents,
    currentWeekWorkouts: weekWorkoutsSummary,
    recentActivity: "Strava not connected — no recent activity data available.",
    activeConflicts: [],
  });

  const conversationMessages: { role: "user" | "assistant"; content: string }[] = isInitial
    ? [{
        role: "user",
        content: `You are meeting this athlete for the first time. Acknowledge their specific upcoming events (${activeEvents.map(e => `${e.name} in ${e.weeksOut} weeks${e.goalTime ? ` targeting ${e.goalTime}` : ""}`).join(", ")}). Then ask 2 targeted questions: what their strength training currently looks like, and whether they play any other sports or do regular activities outside of running. Be direct and conversational. Under 80 words. No bullet points.`,
      }]
    : messages;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
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
