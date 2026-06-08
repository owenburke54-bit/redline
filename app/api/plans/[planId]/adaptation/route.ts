import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// GET /api/plans/[planId]/adaptation — latest undismissed adaptation
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { planId } = await params;

  const plan = await db.trainingPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const adaptation = await db.planAdaptation.findFirst({
    where: { planId, dismissedAt: null },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      adaptationType: true,
      severity: true,
      triggerSignals: true,
      weekRange: true,
      workoutsModified: true,
      coachMessage: true,
      coachSummary: true,
      appliedAt: true,
    },
  });

  return NextResponse.json({ adaptation: adaptation ?? null });
}

// POST /api/plans/[planId]/adaptation/dismiss — dismiss active adaptation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { planId } = await params;

  const body = await req.json().catch(() => ({})) as { adaptationId?: string };

  const plan = await db.trainingPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If adaptationId provided, dismiss that specific one; otherwise dismiss the latest
  const where = body.adaptationId
    ? { id: body.adaptationId, planId, dismissedAt: null }
    : undefined;

  if (where) {
    await db.planAdaptation.updateMany({
      where,
      data: { dismissedAt: new Date() },
    });
  } else {
    const latest = await db.planAdaptation.findFirst({
      where: { planId, dismissedAt: null },
      orderBy: { appliedAt: "desc" },
    });
    if (latest) {
      await db.planAdaptation.update({
        where: { id: latest.id },
        data: { dismissedAt: new Date() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
