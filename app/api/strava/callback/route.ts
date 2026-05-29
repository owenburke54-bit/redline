import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncStravaActivities } from "@/lib/strava/sync";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !userId) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/progress?strava=error`);
  }

  const tokenRes = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/progress?strava=error`);
  }

  const tokens = await tokenRes.json();
  const expiry = new Date(tokens.expires_at * 1000);
  const stravaAthleteId = String(tokens.athlete?.id ?? "");

  await db.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: tokens.access_token,
      stravaRefreshToken: tokens.refresh_token,
      stravaTokenExpiry: expiry,
      stravaId: stravaAthleteId || undefined,
    },
  });

  // Kick off initial 90-day activity backfill (non-blocking)
  syncStravaActivities(userId, 90).catch(() => {});

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/progress?strava=connected`);
}
