import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { whoopId: true, whoopAccessToken: true },
  });

  const connected = !!(user?.whoopAccessToken && user?.whoopId);

  if (!connected) return NextResponse.json({ connected: false });

  const [lastActivity, lastRecovery] = await Promise.all([
    db.whoopActivity.findFirst({
      where: { userId: session.user.id },
      orderBy: { startDate: "desc" },
      select: { startDate: true },
    }),
    db.whoopRecovery.findFirst({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      select: { date: true, recoveryScore: true },
    }),
  ]);

  return NextResponse.json({
    connected: true,
    lastActivityDate: lastActivity?.startDate ?? null,
    latestRecovery: lastRecovery ? {
      date: lastRecovery.date,
      score: lastRecovery.recoveryScore,
    } : null,
  });
}
