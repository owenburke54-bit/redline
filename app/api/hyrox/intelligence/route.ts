import { NextResponse } from "next/server";
import { generateRaceIntelligenceForAllUsers } from "@/lib/hyrox/generateRaceIntelligence";

export const maxDuration = 60;

export async function GET(): Promise<NextResponse> {
  try {
    const result = await generateRaceIntelligenceForAllUsers();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[hyrox/intelligence] Error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
