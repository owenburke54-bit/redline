"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function RestoreTemplateButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setConfirming(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${planId}/restore-template`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Restored template for ${data.updated} workouts.`);
      router.refresh();
    } catch {
      toast.error("Failed to restore template descriptions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-1.5 text-xs transition-colors ${confirming ? "border-primary/60 text-primary" : ""}`}
      onClick={handleClick}
      disabled={loading}
    >
      <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Restoring…" : confirming ? "Tap again to confirm" : "Restore template"}
    </Button>
  );
}
