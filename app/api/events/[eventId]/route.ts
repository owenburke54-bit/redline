import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().optional(),
  goalTime: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(2).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { eventId } = await params;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await db.event.findUnique({ where: { id: eventId } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { date, ...rest } = parsed.data;
  const updated = await db.event.update({
    where: { id: eventId },
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  const { eventId } = await params;

  const existing = await db.event.findUnique({ where: { id: eventId } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.event.update({ where: { id: eventId }, data: { isActive: false } });

  return NextResponse.json({ ok: true });
}
