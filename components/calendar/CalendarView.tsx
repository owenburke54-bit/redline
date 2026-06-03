"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutDetailModal } from "./WorkoutDetailModal";
import type { Workout } from "./WorkoutDetailModal";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  workouts: Workout[];
  currentWeekStart: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── UTC-safe date helpers ──────────────────────────────────────────────────
// Workout scheduledDates are UTC midnight ISO strings. All comparisons and
// display must use UTC methods so a workout on "2026-06-19T00:00:00Z" shows
// as Friday June 19 everywhere regardless of the browser's local timezone.

function getMondayUTC(date: Date): Date {
  const day = date.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diff));
}

function addDaysUTC(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86_400_000);
}

function isSameDayUTC(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function formatMonthRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric", timeZone: "UTC" };
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return start.toLocaleDateString("en-US", opts);
  }
  return `${start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} / ${end.toLocaleDateString("en-US", opts)}`;
}

export function CalendarView({ workouts: initialWorkouts }: CalendarViewProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayUTC(new Date()));
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);

  const weekEnd = addDaysUTC(weekStart, 6);
  const todayUTC = new Date();

  function prevWeek() { setWeekStart(prev => addDaysUTC(prev, -7)); }
  function nextWeek() { setWeekStart(prev => addDaysUTC(prev, 7)); }
  function goToday() { setWeekStart(getMondayUTC(new Date())); }

  function handleWorkoutUpdated(id: string, updates: Partial<Workout>) {
    setWorkouts(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    setSelectedWorkout(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }

  const days = Array.from({ length: 7 }, (_, i) => addDaysUTC(weekStart, i));

  const workoutsByDay = days.map(day => {
    const dayWorkouts = workouts.filter(w => isSameDayUTC(new Date(w.scheduledDate), day));
    const nonRest = dayWorkouts.filter(w => w.type !== "REST");
    // Multiple REST workouts from different plans → show one; if any real sessions exist, hide REST entirely
    return nonRest.length > 0 ? nonRest : dayWorkouts.slice(0, 1);
  });

  const thisWeekEmpty = workoutsByDay.every(d => d.length === 0);
  const hasConflicts = workoutsByDay.some(dayWorkouts => dayWorkouts.some(w => w.conflictFlag));
  const eventNames = [...new Set(workouts.map(w => w.eventName))];

  // Find the earliest scheduled workout to tell the user when their plan starts
  const firstWorkout = workouts.length > 0
    ? workouts.reduce((a, b) => new Date(a.scheduledDate) < new Date(b.scheduledDate) ? a : b)
    : null;
  const firstWorkoutDate = firstWorkout ? new Date(firstWorkout.scheduledDate) : null;
  const planStartsAfterThisWeek = firstWorkoutDate
    ? firstWorkoutDate.getTime() > weekEnd.getTime()
    : false;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase mb-2">Training</p>
          <h1 className="text-[2rem] font-black tracking-tight leading-none">Calendar</h1>
          <p className="text-[13px] text-muted-foreground mt-2">{formatMonthRange(weekStart, weekEnd)}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasConflicts && (
            <Badge variant="destructive" className="text-xs">Conflicts detected</Badge>
          )}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px] px-2.5" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Event legend */}
      {eventNames.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {eventNames.map(name => {
            const workout = workouts.find(w => w.eventName === name);
            const isHyrox = workout?.eventType.startsWith("HYROX");
            return (
              <div key={name} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)" }}
                />
                <span className="text-xs text-muted-foreground">{name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan-start hint when viewing a week before training begins */}
      {thisWeekEmpty && planStartsAfterThisWeek && firstWorkoutDate && (
        <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Your plan starts{" "}
            <span className="text-foreground font-semibold">
              {firstWorkoutDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
            </span>
            . Navigate forward to see your schedule.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs shrink-0"
            onClick={() => setWeekStart(getMondayUTC(firstWorkoutDate))}
          >
            Jump to plan start →
          </Button>
        </div>
      )}

      {/* Mobile: vertical day list */}
      <div className="md:hidden space-y-1">
        {days.map((day, i) => {
          const isToday = isSameDayUTC(day, todayUTC);
          const dayWorkouts = workoutsByDay[i];
          return (
            <div key={i} className="flex gap-3 py-2 border-b border-border/10 last:border-0">
              <div className="w-11 shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                  {DAY_LABELS[i]}
                </p>
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground/70"
                )}>
                  {day.getUTCDate()}
                </div>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {dayWorkouts.length === 0 ? (
                  <div className="flex items-center h-7">
                    <span className="text-[10px] text-muted-foreground/25">Rest</span>
                  </div>
                ) : (
                  dayWorkouts.map(workout => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      onClick={() => setSelectedWorkout(workout)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: 7-column grid */}
      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[560px]">
          {/* Day headers */}
          {days.map((day, i) => {
            const isToday = isSameDayUTC(day, todayUTC);
            return (
              <div key={i} className="text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {DAY_LABELS[i]}
                </p>
                <div
                  className={cn(
                    "mx-auto h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}
                >
                  {day.getUTCDate()}
                </div>
              </div>
            );
          })}

          {/* Workout columns */}
          {workoutsByDay.map((dayWorkouts, i) => (
            <div key={i} className="min-h-[120px] space-y-1.5 pt-1">
              {dayWorkouts.length === 0 ? (
                <div className="h-full min-h-[80px] rounded border border-dashed border-border/20" />
              ) : (
                dayWorkouts.map(workout => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onClick={() => setSelectedWorkout(workout)}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Empty state — no plan at all */}
      {workouts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 p-16 text-center mt-4">
          <Calendar className="h-7 w-7 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-semibold text-[13px]">No workouts scheduled</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Generate a plan from your Events page to populate your calendar.
          </p>
        </div>
      )}

      {selectedWorkout && (
        <WorkoutDetailModal
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onWorkoutUpdated={handleWorkoutUpdated}
        />
      )}
    </div>
  );
}
