import { auth } from "@/auth";
import { db } from "@/lib/db";
import { daysUntil, formatDate } from "@/lib/utils";
import { Trophy, Zap, MessageSquare, ChevronRight } from "lucide-react";
import Link from "next/link";

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
    <div className="max-w-3xl space-y-12">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/50 uppercase mb-2">
          {getTimeOfDay()}
        </p>
        <h1 className="text-[3.25rem] font-black tracking-tight leading-none text-foreground">
          {user?.name?.split(" ")[0] ?? "Athlete"}.
        </h1>
        <p className="text-[13px] text-muted-foreground mt-4">
          Dedication score —{" "}
          <span className="text-primary font-bold">{user?.dedicationScore}/10</span>
        </p>
      </div>

      {/* Upcoming events */}
      {events.length > 0 && (
        <section>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-4">
            Upcoming Events
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {events.map((event) => {
              const days = daysUntil(event.date);
              const isHyrox = event.type.startsWith("HYROX");
              const color = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";
              return (
                <div
                  key={event.id}
                  className="rounded-xl bg-card overflow-hidden"
                >
                  <div className="h-[3px]" style={{ backgroundColor: color }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 pt-0.5">
                        <p className="font-semibold text-[13px] text-foreground leading-tight truncate">
                          {event.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatDate(event.date)}
                        </p>
                        {event.goalTime && (
                          <p
                            className="text-[11px] font-semibold mt-2.5"
                            style={{ color }}
                          >
                            Goal: {event.goalTime}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="text-[3rem] font-black tabular-nums leading-none"
                          style={{ color }}
                        >
                          {days}
                        </p>
                        <p className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground/40 uppercase mt-1">
                          days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Coach CTA */}
      {events.length > 0 && (
        <section>
          <Link href="/coach">
            <div className="group rounded-xl border border-border bg-card p-5 hover:border-primary/25 hover:bg-primary/[0.025] transition-all duration-200 flex items-center gap-4 cursor-pointer">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">
                  Talk to your AI coach
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Discuss goals, strength programming, and race strategy.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
            </div>
          </Link>
        </section>
      )}

      {/* Today's workouts */}
      <section>
        <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-4">
          Today
        </p>
        {todayWorkouts.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No workouts scheduled today.
          </p>
        ) : (
          <div className="space-y-2">
            {todayWorkouts.map((w) => {
              const isHyrox = w.plan.event.type.startsWith("HYROX");
              const color = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";
              const completed = w.status === "COMPLETED";
              return (
                <div
                  key={w.id}
                  className="relative flex items-center gap-4 rounded-xl bg-card px-5 py-4 overflow-hidden"
                >
                  <span
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <Zap
                    className="h-4 w-4 shrink-0 ml-2"
                    style={{ color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{w.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {w.plan.event.name}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider shrink-0 px-2.5 py-1 rounded-full"
                    style={{
                      color: completed ? color : "var(--muted-foreground)",
                      backgroundColor: completed
                        ? "rgba(163,230,53,0.1)"
                        : "rgba(255,255,255,0.04)",
                    }}
                  >
                    {w.status.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 p-16 text-center">
          <Trophy className="h-7 w-7 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-semibold text-[13px] text-foreground">No events yet</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Add your first race to generate a training plan.
          </p>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
