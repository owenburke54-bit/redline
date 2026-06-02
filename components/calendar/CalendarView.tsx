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

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatMonthRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
  if (start.getMonth() === end.getMonth()) {
    return start.toLocaleDateString("en-US", opts);
  }
  const startStr = start.toLocaleDateString("en-US", { month: "short" });
  const endStr = end.toLocaleDateString("en-US", opts);
  return `${startStr} / ${endStr}`;
}

export function CalendarView({ workouts: initialWorkouts, currentWeekStart }: CalendarViewProps) {
  const initialMonday = getMonday(new Date(currentWeekStart));
  const [weekStart, setWeekStart] = useState<Date>(initialMonday);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);

  const weekEnd = addDays(weekStart, 6);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function prevWeek() { setWeekStart(prev => addDays(prev, -7)); }
  function nextWeek() { setWeekStart(prev => addDays(prev, 7)); }
  function goToday() { setWeekStart(getMonday(new Date())); }

  function handleWorkoutUpdated(id: string, updates: Partial<Workout>) {
    setWorkouts(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    // Also update the selected workout so the modal reflects the new state before closing
    setSelectedWorkout(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const workoutsByDay = days.map(day =>
    workouts.filter(w => isSameDay(new Date(w.scheduledDate), day))
  );

  const hasConflicts = workoutsByDay.some(dayWorkouts =>
    dayWorkouts.some(w => w.conflictFlag)
  );

  const eventNames = [...new Set(workouts.map(w => w.eventName))];

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

      {/* Week grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[560px]">
          {/* Day headers */}
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
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
                  {day.getDate()}
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

      {/* Empty state */}
      {workouts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 p-16 text-center mt-4">
          <Calendar className="h-7 w-7 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-semibold text-[13px]">No workouts scheduled</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Generate a plan from your Events page to populate your calendar.
          </p>
        </div>
      )}

      {/* Workout detail modal */}
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
