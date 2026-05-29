import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { syncStravaActivities } from "@/lib/strava/sync";

// POST /api/strava/sync
// - Cron (Authorization: Bearer CRON_SECRET): syncs all connected users
// - Authenticated user (session): syncs the requesting user only
export async function POST(req: NextRequest) {
  const isCron =
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  if (isCron) {
    const users = await db.user.findMany({
      where: { stravaAccessToken: { not: null }, stravaRefreshToken: { not: null } },
      select: { id: true },
    });

    let total = 0;
    for (const user of users) {
      try {
        const count = await syncStravaActivities(user.id);
        total += count;
      } catch (err) {
        console.error(`[strava/sync] failed for user ${user.id}:`, err);
      }
    }

    return NextResponse.json({ ok: true, synced: total });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await syncStravaActivities(session.user.id as string);
    return NextResponse.json({ ok: true, activities: count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
