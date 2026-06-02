import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.user.update({
    where: { id: session.user.id },
    data: {
      garminUserId: null,
      garminAccessToken: null,
      garminAccessTokenSecret: null,
      garminOAuthToken: null,
      garminRequestTokenSecret: null,
    },
  });

  return NextResponse.json({ disconnected: true });
}
