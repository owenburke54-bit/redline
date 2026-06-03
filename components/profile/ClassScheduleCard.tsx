"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";

export type StudioEntry = { id: string; name: string; days: number[] };
export type ClassSchedule = { studios: StudioEntry[] };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Studios known to have HYROX or high-intensity functional programming
const PRESET_STUDIOS: { id: string; name: string; tagline: string; color: string }[] = [
  {
    id: "barrys",
    name: "Barry's",
    tagline: "Treadmill intervals + functional floor work. Counts as a hard run day.",
    color: "#FF2D2D",
  },
  {
    id: "orangetheory",
    name: "OrangeTheory",
    tagline: "Treadmill, rowing, and floor. Rowing transfers directly to HYROX.",
    color: "#FF5500",
  },
  {
    id: "orangetheory_hyrox",
    name: "OTF HYROX",
    tagline: "OrangeTheory's HYROX-specific programming. Replaces planned station work.",
    color: "#FF5500",
  },
  {
    id: "backyard_boston",
    name: "Backyard Boston",
    tagline: "HYROX functional fitness classes. Directly supplements your HYROX plan.",
    color: "#00E87A",
  },
];

function DayPicker({
  days,
  onChange,
}: {
  days: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(d: number) {
    onChange(days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort());
  }
  return (
    <div className="flex gap-1 mt-2">
      {DAYS.map((label, i) => (
        <button
          key={i}
          onClick={() => toggle(i)}
          className="w-8 h-8 rounded text-[10px] font-bold transition-colors"
          style={
            days.includes(i)
              ? { background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)" }
          }
        >
          {label[0]}
        </button>
      ))}
    </div>
  );
}

export function ClassScheduleCard({ initial }: { initial: ClassSchedule | null }) {
  const [studios, setStudios] = useState<StudioEntry[]>(initial?.studios ?? []);
  const [saving, setSaving] = useState(false);

  function toggleStudio(id: string, name: string) {
    setStudios(prev => {
      const exists = prev.find(s => s.id === id);
      if (exists) return prev.filter(s => s.id !== id);
      return [...prev, { id, name, days: [] }];
    });
  }

  function setDays(id: string, days: number[]) {
    setStudios(prev => prev.map(s => s.id === id ? { ...s, days } : s));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studios }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Class schedule saved. Your coach and plan will account for these.");
    } catch {
      toast.error("Failed to save class schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-card overflow-hidden">
      <div className="h-[3px]" style={{ background: "linear-gradient(to right, #FF5500, #00E87A)" }} />
      <div className="p-5">
        <p className="text-[9px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-1">Studio Classes</p>
        <p className="text-[11px] text-muted-foreground/60 mb-5">
          Tell Redline which classes you attend regularly. Your training plan and AI coach will factor these into weekly load and avoid stacking hard sessions on class days.
        </p>

        <div className="space-y-3">
          {PRESET_STUDIOS.map(studio => {
            const active = studios.find(s => s.id === studio.id);
            return (
              <div
                key={studio.id}
                className="rounded-lg p-3 transition-all"
                style={{
                  background: active ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${active ? studio.color + "40" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => toggleStudio(studio.id, studio.name)}
                      className="flex items-center gap-2 text-left"
                    >
                      <div
                        className="h-4 w-4 rounded shrink-0 flex items-center justify-center transition-all"
                        style={{
                          background: active ? studio.color : "rgba(255,255,255,0.08)",
                          border: `1px solid ${active ? studio.color : "rgba(255,255,255,0.15)"}`,
                        }}
                      >
                        {active && <Check className="h-2.5 w-2.5 text-black" />}
                      </div>
                      <span className="text-[13px] font-semibold" style={{ color: active ? studio.color : "rgba(255,255,255,0.7)" }}>
                        {studio.name}
                      </span>
                    </button>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 ml-6">{studio.tagline}</p>
                  </div>
                </div>
                {active && (
                  <div className="mt-2 ml-6">
                    <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">Which days?</p>
                    <DayPicker days={active.days} onChange={days => setDays(studio.id, days)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[12px] font-bold transition-colors"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
        >
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Save Class Schedule"}
        </button>
      </div>
    </div>
  );
}
