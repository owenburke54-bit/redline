import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { syncWhoopData } from "@/lib/whoop/sync";

// Called by Vercel cron (no session) or manually from the UI
export async function POST(req: Request) {
  const isCron = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  if (isCron) {
    // Sync all connected users
    const users = await db.user.findMany({
      where: { whoopAccessToken: { not: null } },
      select: { id: true },
    });

    const results = await Promise.allSettled(
      users.map(u => syncWhoopData(u.id, 7))
    );

    const succeeded = results.filter(r => r.status === "fulfilled").length;
    return NextResponse.json({ synced: succeeded, total: users.length });
  }

  // Manual sync from authenticated user
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { whoopAccessToken: true },
  });

  if (!user?.whoopAccessToken) {
    return NextResponse.json({ error: "WHOOP not connected" }, { status: 400 });
  }

  const result = await syncWhoopData(session.user.id, 30);
  return NextResponse.json(result);
}
