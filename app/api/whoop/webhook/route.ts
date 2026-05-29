import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { syncWorkoutById, syncRecoveryById } from "@/lib/whoop/sync";
import { z } from "zod";

/**
 * WHOOP Webhook Integration
 *
 * WHOOP sends POST requests to this endpoint when a user's data changes.
 * Each event carries a resource ID and the user's WHOOP numeric user_id.
 *
 * Signature verification:
 *   Header: x-whoop-signature (base64 HMAC-SHA256 of the raw request body)
 *   Secret: WHOOP_WEBHOOK_SECRET env var — must match the secret configured
 *   in the WHOOP Developer Portal webhook settings.
 *
 * Event types:
 *   workout.updated   → id is the WHOOP workout ID; calls syncWorkoutById
 *   recovery.updated  → id is the WHOOP cycle ID; calls syncRecoveryById
 *   sleep.updated     → id is the WHOOP cycle ID; recovery record embeds sleep
 *
 * Flow: verify → parse → 200 immediately → sync in background via after()
 */
const whoopPayloadSchema = z.object({
  type: z.enum(["workout.updated", "recovery.updated", "sleep.updated"]),
  id: z.number().int(),
  user_id: z.number().int(),
  trace_id: z.string(),
});

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

  let parsed: z.infer<typeof whoopPayloadSchema>;
  try {
    parsed = whoopPayloadSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { type, id, user_id } = parsed;

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
