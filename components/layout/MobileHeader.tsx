import { Zap } from "lucide-react";

export function MobileHeader() {
  return (
    <header
      className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center px-5 h-14"
      style={{ background: "#111111", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" strokeWidth={2.5} fill="currentColor" />
        <span className="text-[13px] font-black tracking-[0.25em] text-foreground uppercase">
          Redline
        </span>
      </div>
    </header>
  );
}
