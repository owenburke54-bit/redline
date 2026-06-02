import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayWorkouts = await db.workout.findMany({
    where: {
      scheduledDate: { gte: todayStart, lte: todayEnd },
      status: "SCHEDULED",
      type: { not: "REST" },
    },
    select: {
      title: true,
      targetDistance: true,
      targetDuration: true,
      type: true,
      user: { select: { email: true, name: true } },
    },
  });

  type WorkoutRow = typeof todayWorkouts[number];
  const grouped = new Map<string, { name: string; workouts: WorkoutRow[] }>();
  for (const w of todayWorkouts) {
    const email = w.user.email;
    if (!email) continue;
    if (!grouped.has(email)) {
      grouped.set(email, { name: w.user.name ?? "Athlete", workouts: [] });
    }
    grouped.get(email)!.workouts.push(w);
  }

  let sent = 0;
  for (const [email, { name, workouts }] of grouped) {
    const firstName = name.split(" ")[0];
    const lines = workouts
      .map(w => {
        const detail = w.targetDistance
          ? `${w.targetDistance} mi`
          : w.targetDuration
          ? `${w.targetDuration} min`
          : "";
        return `<li>${w.title}${detail ? ` — ${detail}` : ""}</li>`;
      })
      .join("");

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#e4e4e7;background:#09090b">
        <p style="font-size:18px;font-weight:700;margin-bottom:8px">Today's training, ${firstName}.</p>
        <ul style="margin:16px 0;padding-left:20px;color:#a1a1aa;line-height:1.8">${lines}</ul>
        <a href="${process.env.NEXTAUTH_URL ?? "https://redline.app"}"
           style="display:inline-block;margin-top:16px;padding:10px 20px;background:#f97316;color:#000;border-radius:6px;font-weight:700;text-decoration:none;font-size:13px">
          Open Redline →
        </a>
        <p style="margin-top:24px;font-size:11px;color:#52525b">You're receiving this because you have a Redline training plan.</p>
      </div>`;

    const ok = await sendEmail({ to: email, subject: `Redline — Your sessions for today`, html });
    if (ok) sent++;
  }

  return NextResponse.json({ sent });
}
