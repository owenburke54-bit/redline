import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function daysUntil(date: Date | string): number {
  // Use Eastern time for "today" so the counter doesn't flip at midnight UTC (8 PM EDT / 7 PM EST)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parseInt(parts.find(p => p.type === "year")!.value);
  const mo = parseInt(parts.find(p => p.type === "month")!.value) - 1;
  const d = parseInt(parts.find(p => p.type === "day")!.value);
  const todayEst = Date.UTC(y, mo, d);

  const t = new Date(date);
  const targetUtc = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  return Math.ceil((targetUtc - todayEst) / (1000 * 60 * 60 * 24));
}

export function weeksUntil(date: Date | string): number {
  return Math.ceil(daysUntil(date) / 7);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function formatDistance(miles: number): string {
  return `${miles.toFixed(1)}mi`;
}

export function getMonday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
