import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://redline-iota.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    // Always 200 — don't leak whether the email exists
    if (!parsed.success) {
      return NextResponse.json({ resetUrl: null });
    }

    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ resetUrl: null });
    }

    // Invalidate any existing unused tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const record = await db.passwordResetToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const resetUrl = `${BASE_URL}/reset-password?token=${record.token}`;
    return NextResponse.json({ resetUrl });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ resetUrl: null });
  }
}
