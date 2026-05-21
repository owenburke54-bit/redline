"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function ResolveConflictsButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function resolve() {
    setLoading(true);
    try {
      const res = await fetch("/api/conflicts/resolve", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.conflicts === 0) {
        toast.success("No conflicts found — your plans are already well-balanced.");
        setDone(true);
      } else {
        toast.success(`Fixed ${data.resolved} conflict${data.resolved !== 1 ? "s" : ""}. ${data.summary}`);
        setDone(true);
        setTimeout(() => window.location.reload(), 1800);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conflict resolution failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={resolve}
      disabled={loading || done}
      className="gap-1.5 text-[12px] h-8 text-amber-400 border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300"
    >
      {loading ? (
        <><Loader2 className="h-3 w-3 animate-spin" /> Resolving…</>
      ) : done ? (
        <><Check className="h-3 w-3" /> Done</>
      ) : (
        <><AlertTriangle className="h-3 w-3" /> Resolve Conflicts</>
      )}
    </Button>
  );
}
