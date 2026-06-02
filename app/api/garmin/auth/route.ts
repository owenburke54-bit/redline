import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRequestToken, getAuthorizeUrl } from "@/lib/garmin/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token, tokenSecret } = await getRequestToken();

  // Store request token so we can look up this user in the callback
  await db.user.update({
    where: { id: session.user.id },
    data: {
      garminOAuthToken: token,
      garminRequestTokenSecret: tokenSecret,
    },
  });

  return NextResponse.redirect(getAuthorizeUrl(token));
}
