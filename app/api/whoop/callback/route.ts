import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchProfile } from "@/lib/whoop/client";
import { syncWhoopData } from "@/lib/whoop/sync";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?whoop=error`);
  }

  const tokenRes = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/whoop/callback`,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?whoop=error`);
  }

  const tokens = await tokenRes.json();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);

  await db.user.update({
    where: { id: userId },
    data: {
      whoopAccessToken: tokens.access_token,
      whoopRefreshToken: tokens.refresh_token,
      whoopTokenExpiry: expiry,
    },
  });

  // Fetch WHOOP user ID and store it
  try {
    const profile = await fetchProfile(userId);
    await db.user.update({
      where: { id: userId },
      data: { whoopId: String(profile.user_id) },
    });
  } catch {
    // Non-fatal — tokens are already stored
  }

  // Kick off initial 30-day backfill (non-blocking)
  syncWhoopData(userId, 30).catch(() => {});

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?whoop=connected`);
}
