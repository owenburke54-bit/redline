import { auth } from "@/auth";
import { db } from "@/lib/db";
import { daysUntil, formatDate } from "@/lib/utils";
import { EventCard } from "@/components/dashboard/EventCard";
import { AddEventButton } from "@/components/dashboard/AddEventButton";
import { Trophy } from "lucide-react";

export default async function EventsPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const events = await db.event.findMany({
    where: { userId, isActive: true },
    include: { plan: true },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-2">
            Racing
          </p>
          <h1 className="text-[2rem] font-black tracking-tight leading-none">Events</h1>
          <p className="text-[13px] text-muted-foreground mt-2">
            {events.length} active {events.length === 1 ? "event" : "events"}
          </p>
        </div>
        <AddEventButton />
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 p-16 text-center">
          <Trophy className="h-7 w-7 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-semibold text-[13px]">No events yet</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">Add a race to generate your training plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <EventCard
              key={event.id}
              event={{
                id: event.id,
                name: event.name,
                type: event.type,
                date: event.date.toISOString(),
                location: event.location,
                goalTime: event.goalTime,
                priority: event.priority,
                hasPlan: !!event.plan,
                planId: event.plan?.id,
                daysOut: daysUntil(event.date),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
