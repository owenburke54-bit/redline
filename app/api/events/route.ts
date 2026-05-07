import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { EventType } from "@/app/generated/prisma/client";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(EventType),
  date: z.string(),
  location: z.string().nullable().optional(),
  goalTime: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(2).default(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await db.event.findMany({
    where: { userId: session.user.id as string, isActive: true },
    include: { plan: { select: { id: true, status: true, currentWeek: true, totalWeeks: true } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const event = await db.event.create({
    data: {
      userId: session.user.id as string,
      ...parsed.data,
      date: new Date(parsed.data.date),
    },
  });

  return NextResponse.json(event, { status: 201 });
}
