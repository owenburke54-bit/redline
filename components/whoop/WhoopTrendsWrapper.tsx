"use client";

import { useState } from "react";
import { WhoopTrendsSheet } from "./WhoopTrendsSheet";
import { TrendingUp } from "lucide-react";

export function WhoopTrendsWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative cursor-pointer group" onClick={() => setOpen(true)}>
        {children}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ pointerEvents: "none" }}
        >
          <TrendingUp className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-[9px] text-muted-foreground/40 font-semibold uppercase tracking-wider">7-day trend</span>
        </div>
      </div>
      {open && <WhoopTrendsSheet onClose={() => setOpen(false)} />}
    </>
  );
}
