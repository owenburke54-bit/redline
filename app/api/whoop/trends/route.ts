import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [recoveries, strainActivities] = await Promise.all([
    db.whoopRecovery.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: "asc" },
      select: { date: true, recoveryScore: true, sleepScore: true, sleepDuration: true, hrvRmssd: true, restingHr: true },
    }),
    db.whoopActivity.findMany({
      where: { userId, sportName: "Cycle", startDate: { gte: sevenDaysAgo } },
      orderBy: { startDate: "asc" },
      select: { startDate: true, strain: true },
    }),
  ]);

  return NextResponse.json({
    recovery: recoveries.map(r => ({
      date: r.date.toISOString(),
      recoveryScore: r.recoveryScore,
      sleepScore: r.sleepScore,
      sleepDuration: r.sleepDuration,
      hrv: r.hrvRmssd,
      restingHr: r.restingHr,
    })),
    strain: strainActivities.map(a => ({
      date: a.startDate.toISOString(),
      strain: a.strain,
    })),
  });
}
