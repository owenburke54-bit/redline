import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { EventType } from "@/app/generated/prisma/client";

const schema = z.object({
  event: z.object({
    name: z.string().min(1),
    type: z.nativeEnum(EventType),
    date: z.string(),
    location: z.string().nullable(),
    goalTime: z.string().nullable(),
    priority: z.number().int().default(1),
  }),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const userId = session.user.id as string;
  const { event } = parsed.data;

  await db.$transaction([
    db.event.create({
      data: {
        userId,
        name: event.name,
        type: event.type,
        date: new Date(event.date),
        location: event.location,
        goalTime: event.goalTime,
        priority: event.priority,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { onboardingComplete: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}
