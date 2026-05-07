import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  yearsRunning: z.number().int().min(0).nullable(),
  weeklyMileageBaseline: z.number().int().min(0).nullable(),
  injuryHistory: z.string().nullable(),
  goalStatement: z.string().nullable(),
  painToleranceRating: z.number().int().min(1).max(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const userId = session.user.id as string;

  await db.athleteProfile.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ success: true });
}
