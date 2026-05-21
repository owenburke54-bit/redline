import { NextResponse } from "next/server";
import { auth } from "@/auth";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const SCOPES = "read:workout read:recovery read:sleep read:cycles read:profile offline";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/whoop/callback`,
    response_type: "code",
    scope: SCOPES,
    state: session.user.id,
  });

  return NextResponse.redirect(`${WHOOP_AUTH_URL}?${params}`);
}
