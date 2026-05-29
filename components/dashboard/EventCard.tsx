"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, MapPin, Target, Zap, Loader2, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    type: string;
    date: string;
    location?: string | null;
    goalTime?: string | null;
    priority: number;
    hasPlan: boolean;
    planId?: string;
    daysOut: number;
  };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  MARATHON: "Marathon",
  HALF_MARATHON: "Half Marathon",
  HYROX: "Hyrox",
  HYROX_DOUBLES: "Hyrox Mixed Doubles",
  FIVE_K: "5K",
  TEN_K: "10K",
};

export function EventCard({ event }: EventCardProps) {
  const [generating, setGenerating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(event.name);
  const [editDate, setEditDate] = useState(event.date.split("T")[0]);
  const [editGoalTime, setEditGoalTime] = useState(event.goalTime ?? "");
  const [editLocation, setEditLocation] = useState(event.location ?? "");
  const [editPriority, setEditPriority] = useState(String(event.priority));
  const isHyrox = event.type.startsWith("HYROX");
  const accentColor = isHyrox ? "var(--hyrox-color)" : "var(--marathon-color)";

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          date: editDate,
          goalTime: editGoalTime || null,
          location: editLocation || null,
          priority: Number(editPriority),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Event updated.");
      setEditOpen(false);
      window.location.reload();
    } catch {
      toast.error("Failed to update event.");
    } finally {
      setSaving(false);
    }
  }

  async function generatePlan() {
    setGenerating(true);
    try {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Plan generated. Check your calendar.");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate plan.");
    } finally {
      setGenerating(false);
    }
  }

  async function regeneratePlan() {
    if (!event.planId) return;
    setGenerating(true);
    try {
      const delRes = await fetch(`/api/plans/${event.planId}`, { method: "DELETE" });
      if (!delRes.ok) {
        const d = await delRes.json();
        throw new Error(d.error ?? "Failed to delete plan");
      }
      const genRes = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await genRes.json();
      if (!genRes.ok) throw new Error(data.error ?? "Failed to generate plan");
      toast.success("Plan regenerated.");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate plan.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
    <div className="rounded-xl bg-card overflow-hidden">
      <div className="h-[3px]" style={{ backgroundColor: accentColor }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-[13px] text-foreground">{event.name}</h3>
              {event.priority === 1 && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color: accentColor, backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}
                >
                  A Race
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 py-0.5 rounded-full bg-white/[0.04]">
                {EVENT_TYPE_LABELS[event.type] ?? event.type}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground">
                {new Date(event.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {event.location}
                </span>
              )}
              {event.goalTime && (
                <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: accentColor }}>
                  <Target className="h-3 w-3" /> {event.goalTime}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[2.5rem] font-black tabular-nums leading-none" style={{ color: accentColor }}>
              {event.daysOut}
            </p>
            <p className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground/40 uppercase mt-1">days</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-border/50 pt-4">
          {event.hasPlan ? (
            <>
              <Link href={`/plan/${event.planId}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-[12px] h-8">
                  <Zap className="h-3 w-3" /> View Plan
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={regeneratePlan}
                disabled={generating}
                className="gap-1.5 text-[12px] h-8 text-muted-foreground hover:text-foreground"
              >
                {generating ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating…</>
                ) : (
                  <><RefreshCw className="h-3 w-3" /> Regenerate</>
                )}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={generatePlan}
              disabled={generating}
              className="gap-1.5 text-[12px] h-8"
            >
              {generating ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
              ) : (
                <><Zap className="h-3 w-3" /> Generate Plan</>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditOpen(true)}
            className="gap-1.5 text-[12px] h-8 text-muted-foreground hover:text-foreground ml-auto"
          >
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        </div>
      </div>
    </div>

    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={saveEdit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Event name</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Race date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-goalTime">Goal time</Label>
              <Input
                id="edit-goalTime"
                value={editGoalTime}
                onChange={e => setEditGoalTime(e.target.value)}
                placeholder="sub-4:00:00"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
                placeholder="Washington, D.C."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={editPriority} onValueChange={setEditPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">A Race</SelectItem>
                  <SelectItem value="2">B Race</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
