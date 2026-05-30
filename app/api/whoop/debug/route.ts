import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id as string },
    select: { whoopAccessToken: true, whoopRefreshToken: true, whoopTokenExpiry: true, whoopId: true },
  });

  if (!user?.whoopAccessToken) {
    return NextResponse.json({ error: "WHOOP not connected" }, { status: 400 });
  }

  const token = user.whoopAccessToken;
  const now = new Date();
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  async function hit(path: string, params?: Record<string, string>) {
    const url = new URL(`${WHOOP_API_BASE}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const body = res.ok ? await res.json() : await res.text();
    return { status: res.status, body };
  }

  // Get most recent completed cycle ID to test recovery-by-cycle-id
  const cyclesRes = await hit("/cycle", { start: start.toISOString(), end: now.toISOString(), limit: "5" });
  const completedCycleId = cyclesRes.status === 200
    ? cyclesRes.body?.records?.find((r: { end: string | null; id: number }) => r.end != null)?.id
    : null;

  const [workouts, recoveryList, recoveryByIdResult, sleepList, profile] = await Promise.all([
    hit("/activity/workout", { start: start.toISOString(), end: now.toISOString(), limit: "5" }),
    hit("/recovery", { limit: "5" }),
    completedCycleId ? hit(`/recovery/${completedCycleId}`) : Promise.resolve({ status: 0, body: "no completed cycle" }),
    hit("/sleep", { start: start.toISOString(), end: now.toISOString(), limit: "5" }),
    hit("/user/profile/basic"),
  ]);

  return NextResponse.json({
    tokenExpiry: user.whoopTokenExpiry,
    whoopId: user.whoopId,
    queryRange: { start: start.toISOString(), end: now.toISOString() },
    completedCycleIdTested: completedCycleId,
    endpoints: { workouts, recoveryList, recoveryByIdResult, sleepList, profile },
  });
}
