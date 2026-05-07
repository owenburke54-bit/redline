"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutDetailModal } from "./WorkoutDetailModal";
import { cn } from "@/lib/utils";

interface Workout {
  id: string;
  scheduledDate: string;
  type: string;
  title: string;
  description: string | null;
  targetDistance: number | null;
  targetDuration: number | null;
  targetPace: string | null;
  intensityZone: number | null;
  isHyroxSim: boolean;
  status: string;
  conflictFlag: boolean;
  conflictNote: string | null;
  eventType: string;
  eventName: string;
  planId: string;
}

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

export function CalendarView({ workouts, currentWeekStart }: CalendarViewProps) {
  const initialMonday = getMonday(new Date(currentWeekStart));
  const [weekStart, setWeekStart] = useState<Date>(initialMonday);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const weekEnd = addDays(weekStart, 6);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function prevWeek() {
    setWeekStart(prev => addDays(prev, -7));
  }
  function nextWeek() {
    setWeekStart(prev => addDays(prev, 7));
  }
  function goToday() {
    setWeekStart(getMonday(new Date()));
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatMonthRange(weekStart, weekEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasConflicts && (
            <Badge variant="destructive" className="text-xs">Conflicts detected</Badge>
          )}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs px-2.5" onClick={goToday}>
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
      <div className="grid grid-cols-7 gap-2">
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

      {/* Empty state */}
      {workouts.length === 0 && (
        <div className="rounded border border-dashed border-border p-16 text-center mt-4">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-sm">No workouts scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a plan from your Events page to populate your calendar.
          </p>
        </div>
      )}

      {/* Workout detail modal */}
      {selectedWorkout && (
        <WorkoutDetailModal
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
        />
      )}
    </div>
  );
}
