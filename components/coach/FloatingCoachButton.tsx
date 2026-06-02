"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

const NUDGE_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const LS_KEY = "lastCoachVisit";

export function FloatingCoachButton() {
  const pathname = usePathname();
  const [badge, setBadge] = useState(false);

  useEffect(() => {
    if (pathname === "/coach") {
      localStorage.setItem(LS_KEY, String(Date.now()));
      setBadge(false);
    } else {
      const last = localStorage.getItem(LS_KEY);
      setBadge(!last || Date.now() - parseInt(last) > NUDGE_INTERVAL_MS);
    }
  }, [pathname]);

  if (pathname === "/coach") return null;

  return (
    <Link
      href="/coach"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2.5 rounded-full px-4 py-3 shadow-lg transition-all hover:scale-105 active:scale-95"
      style={{
        background: "linear-gradient(135deg, rgba(249,115,22,0.9), rgba(234,88,12,0.9))",
        boxShadow: "0 4px 24px rgba(249,115,22,0.35)",
      }}
    >
      <MessageSquare className="h-4 w-4 text-white" />
      <span className="text-[12px] font-bold text-white tracking-wide">Coach</span>
      {badge && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white" />
        </span>
      )}
    </Link>
  );
}
