import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  // Can't invite yourself
  const me = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (me?.email?.toLowerCase() === normalizedEmail) {
    return NextResponse.json({ error: "You can't invite yourself." }, { status: 400 });
  }

  // Check for existing active/pending partnership
  const existing = await db.partnership.findFirst({
    where: {
      OR: [
        { requesterId: userId, status: { not: "DECLINED" } },
        { partnerId: userId, status: { not: "DECLINED" } },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have an active or pending partnership." }, { status: 400 });
  }

  // Look up invite target
  const target = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true },
  });

  const partnership = await db.partnership.create({
    data: {
      requesterId: userId,
      partnerId: target?.id ?? null,
      inviteEmail: normalizedEmail,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    id: partnership.id,
    targetFound: !!target,
    targetName: target?.name ?? null,
  });
}
