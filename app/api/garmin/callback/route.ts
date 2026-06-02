import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeAccessToken } from "@/lib/garmin/client";
import { syncGarminData } from "@/lib/garmin/sync";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const oauthToken = searchParams.get("oauth_token");
  const oauthVerifier = searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?garmin=error`);
  }

  // Look up the user who initiated this OAuth flow by their stored request token
  const user = await db.user.findFirst({
    where: { garminOAuthToken: oauthToken },
    select: { id: true, garminRequestTokenSecret: true },
  });

  if (!user?.garminRequestTokenSecret) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?garmin=error`);
  }

  let accessToken: Awaited<ReturnType<typeof exchangeAccessToken>>;
  try {
    accessToken = await exchangeAccessToken(oauthToken, user.garminRequestTokenSecret, oauthVerifier);
  } catch {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?garmin=error`);
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      garminAccessToken: accessToken.token,
      garminAccessTokenSecret: accessToken.tokenSecret,
      garminUserId: accessToken.userId ?? undefined,
      garminOAuthToken: null,
      garminRequestTokenSecret: null,
    },
  });

  // Kick off 30-day backfill (non-blocking)
  syncGarminData(user.id, 30).catch(() => {});

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/progress?garmin=connected`);
}
