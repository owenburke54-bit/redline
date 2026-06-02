"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Smartphone, X } from "lucide-react";

export function MobilePreview() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex fixed bottom-6 left-6 z-40 items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm text-muted-foreground px-3.5 py-2 text-[11px] font-semibold shadow-md hover:text-foreground hover:border-foreground/20 transition-colors"
      >
        <Smartphone className="h-3 w-3" />
        Mobile
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-9 right-0 flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Close
            </button>

            {/* Phone shell */}
            <div
              className="relative rounded-[2.5rem] border border-white/10 shadow-2xl"
              style={{ background: "linear-gradient(160deg, #222, #111)", padding: "14px", width: 418 }}
            >
              {/* Dynamic island */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[88px] h-7 rounded-full bg-black" />

              {/* Side buttons (visual only) */}
              <div className="absolute -left-[3px] top-[90px] w-[3px] h-9 rounded-l bg-neutral-600" />
              <div className="absolute -left-[3px] top-[140px] w-[3px] h-9 rounded-l bg-neutral-600" />
              <div className="absolute -right-[3px] top-[115px] w-[3px] h-14 rounded-r bg-neutral-600" />

              {/* Screen */}
              <div className="overflow-hidden bg-neutral-950" style={{ borderRadius: "2rem", width: 390, height: 844 }}>
                <iframe
                  key={open ? "open" : "closed"}
                  src={pathname}
                  title="Mobile preview"
                  style={{ width: 390, height: 844, border: "none", display: "block" }}
                />
              </div>

              {/* Home bar */}
              <div className="flex justify-center mt-2.5">
                <div className="w-28 h-1 rounded-full bg-white/20" />
              </div>
            </div>

            <p className="text-center text-[10px] text-white/30 mt-3">390 × 844 — iPhone 14 viewport</p>
          </div>
        </div>
      )}
    </>
  );
}
