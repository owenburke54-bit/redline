import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Accept or decline an invite
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;
  const { action } = await req.json() as { action: "accept" | "decline" };

  const partnership = await db.partnership.findUnique({ where: { id } });
  if (!partnership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the invited party (or requester for their own invite) can respond
  const isInvited =
    partnership.partnerId === userId ||
    (!partnership.partnerId && partnership.inviteEmail === (await db.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email?.toLowerCase());

  if (!isInvited) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (action === "accept") {
    await db.partnership.update({
      where: { id },
      data: { status: "ACTIVE", partnerId: userId },
    });
  } else {
    await db.partnership.update({
      where: { id },
      data: { status: "DECLINED" },
    });
  }

  return NextResponse.json({ ok: true });
}

// Remove a partnership
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { id } = await params;

  const partnership = await db.partnership.findUnique({ where: { id } });
  if (!partnership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (partnership.requesterId !== userId && partnership.partnerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.partnership.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
