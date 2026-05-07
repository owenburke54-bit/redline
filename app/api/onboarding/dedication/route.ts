import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  dedicationScore: z.number().int().min(1).max(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const userId = session.user.id as string;
  await db.user.update({
    where: { id: userId },
    data: { dedicationScore: parsed.data.dedicationScore },
  });

  return NextResponse.json({ success: true });
}
