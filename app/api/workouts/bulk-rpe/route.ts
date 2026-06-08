import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  updates: z
    .array(
      z.object({
        workoutId: z.string(),
        rpe: z.number().int().min(1).max(10),
        difficulty: z.enum(["TOO_EASY", "ABOUT_RIGHT", "TOO_HARD"]).optional(),
      }),
    )
    .min(1)
    .max(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { updates } = parsed.data;
  const workoutIds = updates.map((u) => u.workoutId);

  // Verify all workouts belong to this user
  const owned = await db.workout.findMany({
    where: { id: { in: workoutIds }, userId },
    select: { id: true },
  });
  const validIds = new Set(owned.map((w) => w.id));

  await Promise.all(
    updates
      .filter((u) => validIds.has(u.workoutId))
      .map((u) =>
        db.workout.update({
          where: { id: u.workoutId },
          data: {
            perceivedEffort: u.rpe,
            ...(u.difficulty ? { perceivedDifficulty: u.difficulty } : {}),
          },
        }),
      ),
  );

  after(async () => {
    const { computeAthleteModel } = await import("@/lib/athlete/computeAthleteModel");
    await computeAthleteModel(userId).catch(() => {});
  });

  return NextResponse.json({ ok: true, updated: owned.length });
}
