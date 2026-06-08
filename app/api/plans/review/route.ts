import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adaptPlan } from "@/lib/plans/adaptPlan";

export async function POST(req: NextRequest) {
  const isCron = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db.user.findMany({
    where: {
      plans: { some: { status: "ACTIVE" } },
    },
    select: { id: true },
  });

  let adapted = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const plansBefore = await db.planAdaptation.count({ where: { userId: user.id } });
      await adaptPlan(user.id);
      const plansAfter = await db.planAdaptation.count({ where: { userId: user.id } });
      if (plansAfter > plansBefore) adapted++;
      else skipped++;
    } catch (err) {
      console.error(`[plans/review] adaptPlan failed for user ${user.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, adapted, skipped, failed, total: users.length });
}
