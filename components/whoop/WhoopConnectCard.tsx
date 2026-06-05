"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WhoopConnectCardProps {
  connected: boolean;
  recoveryScore?: number | null;
  recoveryDate?: string | null;
  lastActivityDate?: string | null;
}

export function WhoopConnectCard({
  connected,
  recoveryScore,
  recoveryDate,
  lastActivityDate,
}: WhoopConnectCardProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/whoop/disconnect", { method: "POST" });
    router.refresh();
  }

  const recoveryColor =
    recoveryScore == null
      ? "var(--muted-foreground)"
      : recoveryScore >= 67
      ? "#00E87A"
      : recoveryScore >= 34
      ? "#FFB800"
      : "#FF2D2D";

  return (
    <div className="rounded border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* WHOOP logo approximation — bold W mark */}
          <div className="flex h-8 w-8 items-center justify-center rounded bg-black text-white text-sm font-black">
            W
          </div>
          <div>
            <p className="text-sm font-semibold">WHOOP</p>
            {connected ? (
              <p className="text-xs text-muted-foreground">
                {lastActivityDate
                  ? `Last synced ${lastActivityDate}`
                  : "Connected"}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Connect to auto-track all activities
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
            href="/api/whoop/auth"
            className="inline-flex items-center rounded px-3 py-1.5 text-xs font-semibold bg-foreground text-background hover:opacity-80 transition-opacity"
          >
            Connect WHOOP
          </a>
        )}
      </div>

      {connected && recoveryScore != null && (
        <div className="mt-4 flex items-center gap-6 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Recovery</p>
            <p
              className="text-2xl font-bold tabular-nums leading-none"
              style={{ color: recoveryColor }}
            >
              {Math.round(recoveryScore)}%
            </p>
            {recoveryDate && (
              <p className="text-xs text-muted-foreground mt-1">{recoveryDate}</p>
            )}
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {recoveryScore >= 67
              ? "Ready to train. High-intensity work is appropriate today."
              : recoveryScore >= 34
              ? "Moderate readiness. Avoid stacking hard sessions."
              : "Low recovery. Prioritize easy effort or rest today."}
          </div>
        </div>
      )}
    </div>
  );
}
