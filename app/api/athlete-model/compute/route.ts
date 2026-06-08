import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { computeAthleteModel } from "@/lib/athlete/computeAthleteModel";

export async function POST(req: NextRequest) {
  const isCron = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  if (isCron) {
    const users = await db.user.findMany({ select: { id: true } });
    const results = await Promise.allSettled(users.map((u) => computeAthleteModel(u.id)));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ computed: succeeded, total: users.length });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await computeAthleteModel(session.user.id as string);
  return NextResponse.json({ ok: true });
}
