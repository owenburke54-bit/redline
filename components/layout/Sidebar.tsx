"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  TrendingUp,
  LogOut,
  Zap,
} from "lucide-react";

const BASE_NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/events", label: "Events", icon: Trophy },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

interface SidebarProps {
  userName?: string | null;
  showHyroxTab?: boolean;
}

function HyroxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

export function Sidebar({ userName, showHyroxTab = false }: SidebarProps) {
  const pathname = usePathname();
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const nav = showHyroxTab
    ? [...BASE_NAV, { href: "/hyrox", label: "HYROX", icon: HyroxIcon }]
    : BASE_NAV;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex h-screen w-[220px] shrink-0 flex-col bg-[#111111]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 py-[22px]">
          <Zap className="h-4 w-4 text-primary" strokeWidth={2.5} fill="currentColor" />
          <span className="text-[13px] font-black tracking-[0.25em] text-foreground uppercase">
            Redline
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                  active
                    ? "bg-white/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-full bg-primary" />
                )}
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-border/40 px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <span className="text-[11px] font-bold text-primary">{initials}</span>
            </div>
            <span className="flex-1 truncate text-[13px] font-medium text-foreground tracking-tight">
              {userName?.split(" ")[0] ?? "User"}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav (hidden on md+) ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center bg-[#111111] border-t border-border/40"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
                active ? "text-primary" : "text-muted-foreground/50"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "")} strokeWidth={active ? 2.5 : 2} />
              <span className={cn("text-[9px] font-bold uppercase tracking-wider", active ? "text-primary" : "text-muted-foreground/40")}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
