import { auth } from "@/auth";
import { db } from "@/lib/db";
import { daysUntil, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [user, events, todayWorkouts] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.event.findMany({
      where: { userId, isActive: true },
      orderBy: { date: "asc" },
    }),
    db.workout.findMany({
      where: {
        userId,
        scheduledDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { plan: { include: { event: true } } },
    }),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {user?.name?.split(" ")[0] ?? "Athlete"}.
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dedication level:{" "}
          <span className="text-primary font-semibold">{user?.dedicationScore}/10</span>
        </p>
      </div>

      {/* Events countdown */}
      {events.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Upcoming Events
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((event) => {
              const days = daysUntil(event.date);
              const isHyrox = event.type.startsWith("HYROX");
              return (
                <div
                  key={event.id}
                  className="rounded border border-border bg-card p-4 flex items-start justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Trophy
                      className="h-4 w-4 shrink-0 mt-0.5"
                      style={{ color: isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)" }}
                    />
                    <div>
                      <p className="font-medium text-sm">{event.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                      {event.goalTime && (
                        <p className="text-xs text-muted-foreground">Goal: {event.goalTime}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)" }}>
                      {days}
                    </p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Today's workouts */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Today
        </h2>
        {todayWorkouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts scheduled today.</p>
        ) : (
          <div className="space-y-2">
            {todayWorkouts.map((w) => {
              const isHyrox = w.plan.event.type.startsWith("HYROX");
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-4 rounded border border-border bg-card px-4 py-3"
                >
                  <Zap
                    className="h-4 w-4 shrink-0"
                    style={{ color: isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{w.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{w.plan.event.name}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs shrink-0"
                    style={{
                      borderColor: w.status === "COMPLETED" ? "var(--hyrox-color)" : "var(--border)",
                      color: w.status === "COMPLETED" ? "var(--hyrox-color)" : "var(--muted-foreground)",
                    }}
                  >
                    {w.status.toLowerCase()}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="rounded border border-dashed border-border p-10 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-sm">No events yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your first race to generate a training plan.
          </p>
        </div>
      )}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}
