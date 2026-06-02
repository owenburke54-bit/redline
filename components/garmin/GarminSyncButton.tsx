"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function GarminSyncButton() {
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/garmin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      toast.success(`Synced ${data.summaries ?? 0} daily summaries from Garmin.`);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Garmin sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={sync}
      disabled={syncing}
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors disabled:opacity-40"
    >
      {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
      {syncing ? "Syncing…" : "Sync"}
    </button>
  );
}
