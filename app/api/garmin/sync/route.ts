import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncGarminData } from "@/lib/garmin/sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { summaries } = await syncGarminData(session.user.id as string, 30);
    return NextResponse.json({ summaries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Garmin sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
