import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "SKIPPED"]),
  actualDistance: z.number().optional(),
  perceivedEffort: z.number().min(1).max(10).optional(),
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

  const updated = await db.workout.update({
    where: { id: workoutId },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : null,
      actualDistance: parsed.data.actualDistance ?? null,
      perceivedEffort: parsed.data.perceivedEffort ?? null,
    },
    select: { status: true },
  });

  return NextResponse.json({ status: updated.status });
}
