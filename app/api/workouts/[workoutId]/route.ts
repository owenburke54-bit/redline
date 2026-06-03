import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "SKIPPED"]).optional(),
  actualDistance: z.number().optional(),
  actualDuration: z.number().int().optional(),
  perceivedEffort: z.number().min(1).max(10).optional(),
  description: z.string().max(3000).optional(),
  perceivedDifficulty: z.enum(["TOO_EASY", "ABOUT_RIGHT", "TOO_HARD"]).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { workoutId } = await params;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const workout = await db.workout.findUnique({ where: { id: workoutId }, select: { userId: true } });
  if (!workout || workout.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { status, actualDistance, actualDuration, perceivedEffort, description, perceivedDifficulty } = parsed.data;

  const updated = await db.workout.update({
    where: { id: workoutId },
    data: {
      ...(status !== undefined && {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      }),
      ...(actualDistance !== undefined && { actualDistance }),
      ...(actualDuration !== undefined && { actualDuration }),
      ...(perceivedEffort !== undefined && { perceivedEffort }),
      ...(description !== undefined && { description }),
      ...(perceivedDifficulty !== undefined && { perceivedDifficulty }),
    },
    select: { status: true },
  });

  return NextResponse.json({ status: updated.status });
}
