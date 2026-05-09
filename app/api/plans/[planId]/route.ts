import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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
