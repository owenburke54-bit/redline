import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { syncWorkoutById, syncRecoveryById } from "@/lib/whoop/sync";

// WHOOP sends one of these event types
type WhoopEventType = "workout.updated" | "recovery.updated" | "sleep.updated";

interface WhoopWebhookPayload {
  type: WhoopEventType;
  id: number;       // resource ID (workout ID or cycle ID)
  user_id: number;  // WHOOP user ID — maps to User.whoopId
  trace_id: string;
}

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = process.env.WHOOP_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification in dev if secret not configured

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Buffer.from(mac).toString("base64");

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-whoop-signature") ?? "";

  const valid = await verifySignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WhoopWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, id, user_id } = payload;

  // Resolve WHOOP user_id → our internal userId
  const user = await db.user.findUnique({
    where: { whoopId: String(user_id) },
    select: { id: true },
  });

  if (!user) {
    // Unknown user — acknowledge so WHOOP doesn't keep retrying
    return NextResponse.json({ ok: true });
  }

  // Return 200 immediately so WHOOP doesn't time out, then sync in background
  after(async () => {
    try {
      if (type === "workout.updated") {
        await syncWorkoutById(user.id, id);
      } else if (type === "recovery.updated" || type === "sleep.updated") {
        // Both event types carry the cycle_id — recovery record embeds sleep data
        await syncRecoveryById(user.id, id);
      }
    } catch (err) {
      console.error(`[WHOOP webhook] sync failed for ${type} id=${id}:`, err);
    }
  });

  return NextResponse.json({ ok: true });
}
