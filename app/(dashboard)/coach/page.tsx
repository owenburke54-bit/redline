import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CoachChat } from "@/components/coach/CoachChat";
import { daysUntil } from "@/lib/utils";

export default async function CoachPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const events = await db.event.findMany({
    where: { userId, isActive: true },
    orderBy: { date: "asc" },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <h1 className="text-xl font-bold">AI Coach</h1>
        {events.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {events.map(e => `${e.name} — ${daysUntil(e.date)} days out`).join("  ·  ")}
          </p>
        )}
      </div>

      {/* Chat — fills remaining height */}
      <div className="flex-1 min-h-0">
        <CoachChat />
      </div>
    </div>
  );
}
