import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all users with at least one active event and an active plan
  const users = await db.user.findMany({
    where: {
      events: { some: { isActive: true } },
      plans: { some: { status: "ACTIVE" } },
    },
    select: { id: true },
  });

  let generated = 0;
  const origin = req.nextUrl.origin;

  for (const user of users) {
    try {
      const res = await fetch(`${origin}/api/brief/weekly`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) generated++;
    } catch {
      // Continue with other users if one fails
    }
  }

  return NextResponse.json({ generated, total: users.length });
}
