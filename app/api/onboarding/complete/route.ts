import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { EventType } from "@/app/generated/prisma/client";

const eventSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(EventType),
  date: z.string(),
  location: z.string().nullable(),
  goalTime: z.string().nullable(),
  priority: z.number().int(),
});

const schema = z.object({
  events: z.array(eventSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const userId = session.user.id as string;
    const { events } = parsed.data;

    await db.$transaction([
      ...events.map((ev) =>
        db.event.create({
          data: {
            userId,
            name: ev.name,
            type: ev.type,
            date: new Date(ev.date),
            location: ev.location,
            goalTime: ev.goalTime,
            priority: ev.priority,
          },
        })
      ),
      db.user.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[onboarding/complete]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
