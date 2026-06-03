"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pause, Play } from "lucide-react";

interface Props {
  planId: string;
  initialStatus: string;
}

export function PlanStatusToggle({ planId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  async function patchStatus(next: "ACTIVE" | "PAUSED") {
    const prev = status;
    setLoading(true);
    setStatus(next);
    setConfirmOpen(false);
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setStatus(prev);
        toast.error("Failed to update plan status.");
      } else {
        toast.success(next === "PAUSED" ? "Plan paused." : "Plan resumed.");
        router.refresh();
      }
    } catch {
      setStatus(prev);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const isPaused = status === "PAUSED";

  if (isPaused) {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.25)" }}
      >
        <Pause className="h-4 w-4 shrink-0" style={{ color: "#FFB800" }} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold" style={{ color: "#FFB800" }}>Plan paused</p>
          <p className="text-[11px] text-muted-foreground/60">
            Progress tracking is paused. Workout logging is disabled until you resume.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => patchStatus("ACTIVE")}
          className="shrink-0 gap-1.5 text-[12px] h-8"
          style={{ borderColor: "rgba(255,184,0,0.4)", color: "#FFB800" }}
        >
          <Play className="h-3 w-3" />
          {loading ? "Resuming…" : "Resume"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => setConfirmOpen(true)}
          className="gap-1.5 text-[12px] h-8 text-muted-foreground/40 hover:text-muted-foreground/70"
        >
          <Pause className="h-3 w-3" />
          Pause plan
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pause your plan?</DialogTitle>
            <DialogDescription>
              Pausing your plan will stop your weekly progress tracking. You can resume at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => patchStatus("PAUSED")}
              className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10"
            >
              {loading ? "Pausing…" : "Pause plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
