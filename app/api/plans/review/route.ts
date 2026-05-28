import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const isCron = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  console.log("[cron] /api/plans/review triggered — not yet implemented");
  return NextResponse.json({ ok: true, message: "not yet implemented" });
}
