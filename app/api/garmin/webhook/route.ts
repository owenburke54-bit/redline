import { NextRequest, NextResponse } from "next/server";
import { processGarminWebhook, GarminWebhookPayload } from "@/lib/garmin/sync";

// Garmin verifies webhook ownership by sending a GET with a verificationCode
export async function GET(req: NextRequest) {
  const verificationCode = new URL(req.url).searchParams.get("verificationCode");
  if (verificationCode) {
    return NextResponse.json({ verificationCode });
  }
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  let payload: GarminWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Process async — return 200 immediately so Garmin doesn't retry
  processGarminWebhook(payload).catch(console.error);

  return NextResponse.json({ received: true });
}
