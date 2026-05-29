import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { planId } = await params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const plan = await db.trainingPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.trainingPlan.update({
    where: { id: planId },
    data: { status: parsed.data.status },
    select: { status: true },
  });

  return NextResponse.json({ status: updated.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const { planId } = await params;

  const plan = await db.trainingPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  await db.$transaction([
    db.workout.deleteMany({ where: { planId } }),
    db.trainingPlan.delete({ where: { id: planId } }),
  ]);

  return NextResponse.json({ success: true });
}
