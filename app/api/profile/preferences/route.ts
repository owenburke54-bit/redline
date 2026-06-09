import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const body = await req.json() as Record<string, unknown>;

  const updateData: Record<string, unknown> = {};
  if (typeof body.showHyroxTab === "boolean") updateData.showHyroxTab = body.showHyroxTab;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.athleteProfile.upsert({
    where: { userId },
    create: { userId, ...updateData },
    update: updateData,
  });

  return NextResponse.json({ ok: true });
}
