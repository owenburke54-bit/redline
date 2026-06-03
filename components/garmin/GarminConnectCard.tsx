"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GarminConnectCardProps {
  connected: boolean;
  bodyBattery?: number | null;
  batteryDate?: string | null;
  lastSyncDate?: string | null;
}

export function GarminConnectCard({
  connected,
  bodyBattery,
  batteryDate,
  lastSyncDate,
}: GarminConnectCardProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/garmin/disconnect", { method: "POST" });
    router.refresh();
  }

  const batteryColor =
    bodyBattery == null
      ? "var(--muted-foreground)"
      : bodyBattery >= 70
      ? "#00E87A"
      : bodyBattery >= 50
      ? "#FFB800"
      : "#FF2D2D";

  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded text-white text-[10px] font-black" style={{ backgroundColor: "#1a6ef5" }}>
            G
          </div>
          <div>
            <p className="text-sm font-semibold">Garmin Connect</p>
            {connected ? (
              <p className="text-xs text-muted-foreground">
                {lastSyncDate ? `Last synced ${lastSyncDate}` : "Connected"}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Connect to track Body Battery, sleep &amp; stress
              </p>
            )}
          </div>
        </div>

        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <a
            href="/api/garmin/auth"
            className="inline-flex items-center rounded px-3 py-1.5 text-xs font-semibold bg-foreground text-background hover:opacity-80 transition-opacity"
          >
            Connect Garmin
          </a>
        )}
      </div>

      {connected && bodyBattery != null && (
        <div className="mt-4 flex items-center gap-6 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Body Battery</p>
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: batteryColor }}>
              {Math.round(bodyBattery)}%
            </p>
            {batteryDate && <p className="text-xs text-muted-foreground mt-1">{batteryDate}</p>}
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {bodyBattery >= 70
              ? "High energy. Push hard sessions with confidence."
              : bodyBattery >= 40
              ? "Moderate energy. Stay within prescribed effort."
              : "Low battery. Easy effort or rest recommended."}
          </div>
        </div>
      )}
    </div>
  );
}
