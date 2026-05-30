import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1";
const WHOOP_API_BASE_V2 = "https://api.prod.whoop.com/developer/v2";

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

  async function hit(path: string, params?: Record<string, string>, base = WHOOP_API_BASE) {
    const url = new URL(`${base}${path}`);
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

  const [v1Recovery, v1Sleep, v2Recovery, v2Sleep, v2Workout] = await Promise.all([
    hit("/recovery", { limit: "5" }),
    hit("/sleep", { limit: "5" }),
    hit("/recovery", { limit: "5" }, WHOOP_API_BASE_V2),
    hit("/activity/sleep", { limit: "5" }, WHOOP_API_BASE_V2),
    hit("/activity/workout", { limit: "5" }, WHOOP_API_BASE_V2),
  ]);

  return NextResponse.json({
    tokenScopes,
    tokenExpiry: user.whoopTokenExpiry,
    whoopId: user.whoopId,
    v1: { recovery: v1Recovery, sleep: v1Sleep },
    v2: { recovery: v2Recovery, sleep: v2Sleep, workout: v2Workout },
  });
}
