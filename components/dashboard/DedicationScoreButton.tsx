"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const LABELS: Record<number, string> = {
  1: "One easy day a week", 2: "Light, 2–3 days", 3: "Consistent base",
  4: "Building habits", 5: "Balanced", 6: "Focused training",
  7: "High commitment", 8: "Competitive prep", 9: "All-in", 10: "Peak performance mode",
};

export function DedicationScoreButton({ score }: { score: number }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(score);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save(val: number) {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/dedication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dedicationScore: val }),
      });
      if (!res.ok) throw new Error();
      setSelected(val);
      setOpen(false);
      router.refresh();
      toast.success(`Dedication score updated to ${val}/10`);
    } catch {
      toast.error("Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-left group"
      >
        <span className="text-[12px] text-muted-foreground/50">
          Dedication —{" "}
          <span className="text-primary font-bold group-hover:underline">{selected}/10</span>
          <span className="text-muted-foreground/30 ml-1">· {LABELS[selected] ?? "tap to set"}</span>
        </span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setOpen(false)}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-5 pb-8 animate-sheet-up"
            style={{ background: "var(--color-bg-surface, #111111)", border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none" }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              Dedication score
            </p>
            <p className="text-[13px] text-muted-foreground/50 mb-5">
              How hard do you want to push this training block?
            </p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  disabled={saving}
                  onClick={() => save(n)}
                  className="flex flex-col items-center justify-center rounded-xl py-3 transition-all"
                  style={{
                    background: n === selected ? "rgba(255,85,0,0.15)" : "rgba(255,255,255,0.05)",
                    border: n === selected ? "1px solid rgba(255,85,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: n === selected ? "#FF5500" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <span className="text-[18px] font-black leading-none">{n}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-[12px] text-muted-foreground/40 h-4">
              {LABELS[selected]}
            </p>
          </div>
        </>
      )}
    </>
  );
}
