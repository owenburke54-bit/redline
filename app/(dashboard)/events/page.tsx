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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {events.length} active {events.length === 1 ? "event" : "events"}
          </p>
        </div>
        <AddEventButton />
      </div>

      {events.length === 0 ? (
        <div className="rounded border border-dashed border-border p-12 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-sm">No events yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add a race to generate your training plan.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
