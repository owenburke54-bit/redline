import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const studioSchema = z.object({
  id: z.string(),
  name: z.string(),
  days: z.array(z.number().min(0).max(6)),
});

const schema = z.object({
  studios: z.array(studioSchema),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const profile = await db.athleteProfile.findUnique({
    where: { userId },
    select: { classSchedule: true },
  });

  return NextResponse.json({ classSchedule: profile?.classSchedule ?? null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await db.athleteProfile.upsert({
    where: { userId },
    create: { userId, classSchedule: parsed.data as object },
    update: { classSchedule: parsed.data as object },
  });

  return NextResponse.json({ ok: true });
}
