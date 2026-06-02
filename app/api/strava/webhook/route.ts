import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncStravaActivities } from "@/lib/strava/sync";

// GET: Strava webhook subscription verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN &&
    challenge
  ) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Strava activity event — sync the owner's activities
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Only handle new activity creation
  if (body.object_type !== "activity" || body.aspect_type !== "create") {
    return NextResponse.json({ status: "ignored" });
  }

  const stravaOwnerId = String(body.owner_id);

  const user = await db.user.findFirst({
    where: { stravaId: stravaOwnerId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ status: "unknown_owner" });
  }

  // Sync last 2 days to pick up the new activity
  try {
    const upserted = await syncStravaActivities(user.id, 2);
    return NextResponse.json({ status: "synced", upserted });
  } catch (err) {
    console.error("Strava webhook sync error", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
