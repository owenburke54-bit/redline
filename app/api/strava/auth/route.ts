import { NextResponse } from "next/server";
import { auth } from "@/auth";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state: session.user.id,
  });

  return NextResponse.redirect(`${STRAVA_AUTH_URL}?${params}`);
}
