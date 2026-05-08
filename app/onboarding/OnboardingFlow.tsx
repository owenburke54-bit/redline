"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Trophy, Activity, Target, ChevronRight, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = ["profile", "dedication", "event"] as const;
type Step = (typeof STEPS)[number];

const EVENT_TYPES = [
  { value: "MARATHON", label: "Marathon" },
  { value: "HALF_MARATHON", label: "Half Marathon" },
  { value: "HYROX", label: "Hyrox" },
  { value: "HYROX_DOUBLES", label: "Hyrox Mixed Doubles" },
  { value: "FIVE_K", label: "5K" },
  { value: "TEN_K", label: "10K" },
];

const DEDICATION_COPY: Record<number, string> = {
  1: "Easy maintenance. Fitness without pressure.",
  2: "Light commitment. A few sessions a week.",
  3: "Consistent but flexible. Life comes first.",
  4: "Building a habit. Training is a priority.",
  5: "Solid base. You show up most days.",
  6: "Serious. You plan your week around training.",
  7: "High output. You train consistently and push hard.",
  8: "Very high. Few sessions missed. Expect difficulty.",
  9: "Elite commitment. You will not miss a session.",
  10: "All in. This is your life right now.",
};

interface EventDraft {
  name: string;
  type: string;
  date: string;
  location: string;
  goalTime: string;
}

interface Props {
  userId: string;
  userName?: string | null;
}

export function OnboardingFlow({ userId: _userId, userName }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState<Step>("profile");
  const [loading, setLoading] = useState(false);

  // Profile state
  const [yearsRunning, setYearsRunning] = useState("");
  const [weeklyMileage, setWeeklyMileage] = useState("");
  const [injuryHistory, setInjuryHistory] = useState("");
  const [goalStatement, setGoalStatement] = useState("");
  const [painTolerance, setPainTolerance] = useState([6]);

  // Dedication state
  const [dedication, setDedication] = useState([7]);

  // Event state
  const [savedEvents, setSavedEvents] = useState<EventDraft[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [goalTime, setGoalTime] = useState("");

  function currentFormFilled() {
    return eventName.trim() && eventType && eventDate;
  }

  function addAnotherEvent() {
    if (!currentFormFilled()) {
      toast.error("Fill in event name, type, and date first.");
      return;
    }
    setSavedEvents((prev) => [
      ...prev,
      { name: eventName, type: eventType, date: eventDate, location: eventLocation, goalTime },
    ]);
    setEventName("");
    setEventType("");
    setEventDate("");
    setEventLocation("");
    setGoalTime("");
  }

  function removeEvent(idx: number) {
    setSavedEvents((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleProfileNext() {
    setLoading(true);
    try {
      await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearsRunning: yearsRunning ? parseInt(yearsRunning) : null,
          weeklyMileageBaseline: weeklyMileage ? parseInt(weeklyMileage) : null,
          injuryHistory: injuryHistory || null,
          goalStatement: goalStatement || null,
          painToleranceRating: painTolerance[0],
        }),
      });
      setStep("dedication");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDedicationNext() {
    setLoading(true);
    try {
      await fetch("/api/onboarding/dedication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dedicationScore: dedication[0] }),
      });
      setStep("event");
    } catch {
      toast.error("Failed to save dedication.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();

    const allEvents: EventDraft[] = [...savedEvents];
    if (currentFormFilled()) {
      allEvents.push({
        name: eventName,
        type: eventType,
        date: eventDate,
        location: eventLocation,
        goalTime,
      });
    }

    if (allEvents.length === 0) {
      toast.error("Add at least one event.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: allEvents.map((ev, i) => ({
            name: ev.name,
            type: ev.type,
            date: ev.date,
            location: ev.location || null,
            goalTime: ev.goalTime || null,
            priority: i + 1,
          })),
        }),
      });
      if (!res.ok) {
        let msg = "Failed to complete setup.";
        try {
          const d = await res.json();
          msg = d.error ?? msg;
        } catch {}
        throw new Error(msg);
      }
      toast.success("You're all set. Generating your plan…");
      await update();
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete setup.");
    } finally {
      setLoading(false);
    }
  }

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="w-full max-w-lg lg:max-w-3xl">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-10">
        <Zap className="h-6 w-6 text-primary" strokeWidth={2.5} />
        <span className="text-2xl font-bold tracking-widest uppercase">Redline</span>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= stepIdx ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </div>

      {/* Step: Profile */}
      {step === "profile" && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Step 1 of 3
              </span>
            </div>
            <h2 className="text-xl font-bold">
              Hey {userName?.split(" ")[0] ?? "Athlete"}. Tell us about yourself.
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              This shapes every plan we generate.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="years">Years running</Label>
                  <Input
                    id="years"
                    type="number"
                    min={0}
                    max={50}
                    placeholder="3"
                    value={yearsRunning}
                    onChange={(e) => setYearsRunning(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mileage">Weekly miles (baseline)</Label>
                  <Input
                    id="mileage"
                    type="number"
                    min={0}
                    placeholder="25"
                    value={weeklyMileage}
                    onChange={(e) => setWeeklyMileage(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="injury">Injury history (optional)</Label>
                <Textarea
                  id="injury"
                  placeholder="Left knee tendinopathy in 2024, resolved. No current issues."
                  rows={4}
                  value={injuryHistory}
                  onChange={(e) => setInjuryHistory(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="goal">What do you want to achieve?</Label>
                <Textarea
                  id="goal"
                  placeholder="I want to finish the Marine Corps Marathon in under 4 hours."
                  rows={4}
                  value={goalStatement}
                  onChange={(e) => setGoalStatement(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>
                  Pain tolerance:{" "}
                  <span className="text-primary font-semibold">{painTolerance[0]}/10</span>
                </Label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={painTolerance}
                  onValueChange={setPainTolerance}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 — Very sensitive</span>
                  <span>10 — Iron</span>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleProfileNext} className="w-full gap-2" disabled={loading}>
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step: Dedication */}
      {step === "dedication" && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Step 2 of 3
              </span>
            </div>
            <h2 className="text-xl font-bold">How hard do you want to go?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This controls plan volume, rest days, and AI coaching tone.
            </p>
          </div>

          <div className="space-y-6 lg:max-w-md mx-auto">
            <div className="rounded border border-border bg-card p-6 text-center space-y-2">
              <p className="text-5xl font-bold text-primary tabular-nums">{dedication[0]}</p>
              <p className="text-sm text-muted-foreground">{DEDICATION_COPY[dedication[0]]}</p>
            </div>

            <Slider
              min={1}
              max={10}
              step={1}
              value={dedication}
              onValueChange={setDedication}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 — Maintenance</span>
              <span>10 — All in</span>
            </div>

            {dedication[0] >= 8 && (
              <p className="text-xs text-primary border border-primary/30 rounded p-3">
                You asked for hard. The AI will not soften your plan. Expect to be pushed.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("profile")} className="flex-1">
              Back
            </Button>
            <Button onClick={handleDedicationNext} className="flex-1 gap-2" disabled={loading}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Event */}
      {step === "event" && (
        <form onSubmit={handleFinish} className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Step 3 of 3
              </span>
            </div>
            <h2 className="text-xl font-bold">Add your events.</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add all the races you're training for. We'll build a plan around each one.
            </p>
          </div>

          {/* Saved events */}
          {savedEvents.length > 0 && (
            <div className="space-y-2">
              {savedEvents.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded border border-border bg-card px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{ev.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {EVENT_TYPES.find((t) => t.value === ev.type)?.label} ·{" "}
                      {new Date(ev.date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEvent(i)}
                    className="text-muted-foreground hover:text-foreground transition-colors ml-4"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Current event form */}
          <div
            className={cn(
              "space-y-4",
              savedEvents.length > 0 && "pt-4 border-t border-border"
            )}
          >
            {savedEvents.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Add another event
              </p>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventName">
                  Event name {savedEvents.length === 0 && <span className="text-primary">*</span>}
                </Label>
                <Input
                  id="eventName"
                  placeholder="Marine Corps Marathon"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Event type {savedEvents.length === 0 && <span className="text-primary">*</span>}
                </Label>
                <Select onValueChange={setEventType} value={eventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eventDate">
                  Race date {savedEvents.length === 0 && <span className="text-primary">*</span>}
                </Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goalTime">Goal time</Label>
                <Input
                  id="goalTime"
                  placeholder="sub-4:00:00"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="Washington, D.C."
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          {currentFormFilled() && (
            <Button
              type="button"
              variant="outline"
              onClick={addAnotherEvent}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add another event
            </Button>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("dedication")}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={loading || (savedEvents.length === 0 && !currentFormFilled())}
            >
              {loading ? "Setting up…" : "Finish setup"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
