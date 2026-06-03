"use client";

import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

interface CoachNudgeCardProps {
  prompt: string;
  subtext: string;
}

export function CoachNudgeCard({ prompt, subtext }: CoachNudgeCardProps) {
  const router = useRouter();

  function handleClick() {
    localStorage.setItem("coachPendingQuestion", prompt);
    router.push("/coach");
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group rounded-xl bg-card border border-border p-5 hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
          <Zap className="h-4 w-4 text-primary" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase mb-1.5">
            {subtext}
          </p>
          <p className="text-[13px] text-foreground font-medium leading-snug">
            {prompt}
          </p>
          <p className="text-[11px] text-primary font-semibold mt-2.5 group-hover:underline">
            <span className="inline-block py-1">Ask coach →</span>
          </p>
        </div>
      </div>
    </button>
  );
}
