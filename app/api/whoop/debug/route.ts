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

  // Decode JWT payload to inspect granted scopes (no verification needed, just inspection)
  let tokenScopes: string | null = null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    tokenScopes = payload.scope ?? payload.scopes ?? JSON.stringify(payload);
  } catch { tokenScopes = "could not decode"; }

  const cyclesRes = await hit("/cycle", { start: start.toISOString(), end: now.toISOString(), limit: "3" });
  const completedCycleId = cyclesRes.status === 200
    ? cyclesRes.body?.records?.find((r: { end: string | null; id: number }) => r.end != null)?.id
    : null;

  const results = await Promise.all([
    hit("/recovery", { limit: "5" }),
    completedCycleId ? hit(`/recovery/${completedCycleId}`) : Promise.resolve({ status: 0, body: "skipped" }),
    hit("/sleep", { limit: "5" }),
    completedCycleId ? hit(`/cycle/${completedCycleId}`) : Promise.resolve({ status: 0, body: "skipped" }),
    // Nested endpoints — some WHOOP API versions use these
    completedCycleId ? hit(`/cycle/${completedCycleId}/recovery`) : Promise.resolve({ status: 0, body: "skipped" }),
    completedCycleId ? hit(`/cycle/${completedCycleId}/sleep`) : Promise.resolve({ status: 0, body: "skipped" }),
    hit("/user/measurement/body"),
  ]);

  const [recoveryList, recoveryById, sleepList, cycleById, nestedRecovery, nestedSleep, bodyMeasurement] = results;

  return NextResponse.json({
    tokenScopes,
    tokenExpiry: user.whoopTokenExpiry,
    whoopId: user.whoopId,
    completedCycleIdTested: completedCycleId,
    endpoints: { recoveryList, recoveryById, sleepList, cycleById, nestedRecovery, nestedSleep, bodyMeasurement },
  });
}
