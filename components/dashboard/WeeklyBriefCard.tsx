"use client";

import { useState, useEffect, useRef } from "react";

export function WeeklyBriefCard() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Try GET first
      try {
        const res = await fetch("/api/brief/weekly");
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json() as { content: string | null };

        if (data.content) {
          if (!cancelled) { setContent(data.content); setLoading(false); }
          return;
        }

        // No content — trigger generation
        await fetch("/api/brief/weekly", { method: "POST" });
        if (cancelled) return;

        // Poll until content arrives (max 30s / ~10 attempts)
        pollRef.current = setInterval(async () => {
          attemptsRef.current++;
          if (attemptsRef.current > 10) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (!cancelled) setLoading(false);
            return;
          }
          try {
            const pollRes = await fetch("/api/brief/weekly");
            if (!pollRes.ok) return;
            const pollData = await pollRes.json() as { content: string | null };
            if (pollData.content) {
              if (pollRef.current) clearInterval(pollRef.current);
              if (!cancelled) { setContent(pollData.content); setLoading(false); }
            }
          } catch {
            // ignore poll errors
          }
        }, 3000);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Don't render if not loading and no content
  if (!loading && !content) return null;

  return (
    <div className="rounded-xl bg-card border border-border/40 p-5">
      <p className="text-[9px] font-semibold tracking-[0.22em] text-muted-foreground/30 uppercase mb-3">
        This Week
      </p>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 rounded bg-muted/40 animate-pulse w-full" />
          <div className="h-4 rounded bg-muted/40 animate-pulse w-4/5" />
          <div className="h-4 rounded bg-muted/40 animate-pulse w-3/5" />
        </div>
      ) : (
        <p className="text-[13px] text-foreground/80 leading-relaxed">
          {content && content.length > 220 ? content.slice(0, 220).trimEnd() + "…" : content}
        </p>
      )}
    </div>
  );
}
