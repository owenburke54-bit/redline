import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000);

  // Users with active plans who haven't checked in recently
  const users = await db.user.findMany({
    where: {
      onboardingComplete: true,
      plans: { some: { status: "ACTIVE" } },
    },
    select: {
      id: true,
      email: true,
      name: true,
      checkins: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const needsCheckin = users.filter(u => {
    const last = u.checkins[0];
    return !last || last.createdAt < sixDaysAgo;
  });

  let sent = 0;
  for (const user of needsCheckin) {
    if (!user.email) continue;
    const firstName = (user.name ?? "Athlete").split(" ")[0];

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#e4e4e7;background:#09090b">
        <p style="font-size:18px;font-weight:700;margin-bottom:8px">Weekly check-in, ${firstName}.</p>
        <p style="color:#a1a1aa;line-height:1.6;margin-bottom:20px">
          How did this week go? Your coach wants to know — a quick check-in helps adjust next week's training load.
        </p>
        <a href="${process.env.NEXTAUTH_URL ?? "https://redline.app"}"
           style="display:inline-block;padding:10px 20px;background:#f97316;color:#000;border-radius:6px;font-weight:700;text-decoration:none;font-size:13px">
          Do your check-in →
        </a>
        <p style="margin-top:24px;font-size:11px;color:#52525b">Redline — endurance and functional fitness training</p>
      </div>`;

    const ok = await sendEmail({ to: user.email, subject: "Redline — How was your week?", html });
    if (ok) sent++;
  }

  return NextResponse.json({ sent });
}
