import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  if (userId !== (session.user.id as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const model = await db.athleteModel.findUnique({ where: { userId } });
  if (!model) return NextResponse.json(null, { status: 404 });

  return NextResponse.json(model);
}
