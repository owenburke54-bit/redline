"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";

export function FloatingCoachButton() {
  const pathname = usePathname();
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
    </Link>
  );
}
