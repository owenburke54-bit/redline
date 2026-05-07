"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = [
  { value: "MARATHON", label: "Marathon" },
  { value: "HALF_MARATHON", label: "Half Marathon" },
  { value: "HYROX", label: "Hyrox" },
  { value: "HYROX_DOUBLES", label: "Hyrox Mixed Doubles" },
  { value: "FIVE_K", label: "5K" },
  { value: "TEN_K", label: "10K" },
];

export function AddEventButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        type,
        date: fd.get("date"),
        location: fd.get("location") || null,
        goalTime: fd.get("goalTime") || null,
        priority: Number(fd.get("priority")),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      toast.error("Failed to add event.");
      return;
    }
    toast.success("Event added.");
    setOpen(false);
    window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Event name *</Label>
            <Input id="name" name="name" required placeholder="Marine Corps Marathon" />
          </div>
          <div className="space-y-1.5">
            <Label>Event type *</Label>
            <Select onValueChange={setType} value={type} required>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Race date *</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goalTime">Goal time</Label>
              <Input id="goalTime" name="goalTime" placeholder="sub-4:00:00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Washington, D.C." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="1">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">A Race</SelectItem>
                  <SelectItem value="2">B Race</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !type}>
            {loading ? "Adding…" : "Add Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
