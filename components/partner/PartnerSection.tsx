"use client";

import { useState, useEffect } from "react";
import { Users, Zap, AlertCircle, X, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const WORKOUT_SHORT: Record<string, string> = {
  EASY_RUN: "Easy Run", LONG_RUN: "Long Run", TEMPO: "Tempo",
  INTERVALS: "Intervals", HYROX_STATION_WORK: "Station Work",
  HYROX_SIM: "HYROX Sim", STRENGTH: "Strength",
  CROSS_TRAIN: "Cross-Train", REST: "Rest", RACE: "Race",
};

type SummaryData =
  | { status: "none" }
  | { status: "pending_sent"; partnershipId: string; inviteEmail: string; targetName: string | null }
  | { status: "pending_received"; partnershipId: string; inviterName: string }
  | {
      status: "active";
      partnershipId: string;
      partner: {
        name: string;
        lastWorkout: { type: string; title: string; date: string; distance: number | null } | null;
        daysSinceLastWorkout: number | null;
        weekReadiness: number | null;
        whoopRecovery: number | null;
      };
      combinedPrediction: {
        formatted: string;
        confidence: string;
        slowerRunner: "you" | "partner" | "equal";
        yourPace: string | null;
        partnerPace: string | null;
      } | null;
    };

function InviteSheet({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/partnerships/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(data.targetFound
        ? `Invite sent to ${data.targetName ?? email}.`
        : `Invite queued — they'll see it when they join.`);
      setOpen(false);
      setEmail("");
      onInvited();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all"
        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        Invite partner
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-5 pb-8"
            style={{ background: "var(--color-bg-surface, #111111)", border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              Training Partner
            </p>
            <p className="text-[18px] font-black mb-1">Link a partner.</p>
            <p className="text-[12px] text-muted-foreground/50 mb-5">
              They&apos;ll see your weekly progress and readiness. You&apos;ll see theirs. Combined HYROX race time uses both your fitness data.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                placeholder="Partner's email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl text-[14px] bg-transparent text-foreground"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              />
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full py-3 rounded-xl text-[13px] font-bold disabled:opacity-50 transition-opacity"
                style={{ background: "#FF5500", color: "#080808" }}
              >
                {sending ? "Sending…" : "Send Invite"}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}

function recoveryColor(score: number) {
  if (score >= 67) return "#00E87A";
  if (score >= 34) return "#FFB800";
  return "#FF2D2D";
}

function readinessColor(pct: number) {
  if (pct >= 80) return "#00E87A";
  if (pct >= 55) return "#FFB800";
  return "#FF2D2D";
}

export function PartnerSection() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/partnerships/summary");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function respond(id: string, action: "accept" | "decline") {
    await fetch(`/api/partnerships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    toast.success(action === "accept" ? "Partner linked!" : "Invite declined.");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/partnerships/${id}`, { method: "DELETE" });
    toast.success("Partnership removed.");
    load();
  }

  if (loading) return null;

  // No partnership — just show invite button
  if (!data || data.status === "none") {
    return (
      <section>
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            Training Partner
          </p>
        </div>
        <div className="card-base p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold mb-0.5">Link a training partner</p>
            <p className="text-[11px] text-muted-foreground/50">
              See each other&apos;s readiness, hold each other accountable, get a combined HYROX prediction.
            </p>
          </div>
          <InviteSheet onInvited={load} />
        </div>
      </section>
    );
  }

  // Invite sent — waiting
  if (data.status === "pending_sent") {
    return (
      <section>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2 md:mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
          Training Partner
        </p>
        <div className="card-base p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                <p className="text-[12px] font-semibold text-muted-foreground/60">Invite pending</p>
              </div>
              <p className="text-[14px] font-bold">{data.targetName ?? data.inviteEmail}</p>
              <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                Waiting for them to accept. They&apos;ll see it when they log in.
              </p>
            </div>
            <button onClick={() => remove(data.partnershipId)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
              title="Cancel invite">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Invite received
  if (data.status === "pending_received") {
    return (
      <section>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2 md:mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
          Training Partner
        </p>
        <div className="card-base overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: "#FF5500" }} />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" style={{ color: "#FF5500" }} />
              <p className="text-[12px] font-bold" style={{ color: "#FF5500" }}>Partner invite</p>
            </div>
            <p className="text-[15px] font-black mb-1">{data.inviterName} wants to train with you.</p>
            <p className="text-[12px] text-muted-foreground/50 mb-4">
              You&apos;ll see each other&apos;s weekly readiness and get a combined race time prediction.
            </p>
            <div className="flex gap-2">
              <button onClick={() => respond(data.partnershipId, "accept")}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-bold"
                style={{ background: "rgba(0,232,122,0.15)", color: "#00E87A", border: "1px solid rgba(0,232,122,0.3)" }}>
                <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5" />Accept
              </button>
              <button onClick={() => respond(data.partnershipId, "decline")}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold text-muted-foreground/50"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Decline
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Active partnership
  const { partner, combinedPrediction, partnershipId } = data;
  const lastDate = partner.lastWorkout ? new Date(partner.lastWorkout.date) : null;
  const daysSince = partner.daysSinceLastWorkout;

  return (
    <section>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
          Training Partner
        </p>
        <button onClick={() => remove(partnershipId)}
          className="text-[10px] text-muted-foreground/25 hover:text-muted-foreground/50 transition-colors">
          Unlink
        </button>
      </div>

      <div className="card-base overflow-hidden">
        <div className="h-[3px]" style={{ backgroundColor: "#FF5500" }} />
        <div className="p-5 space-y-4">

          {/* Partner header row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[18px] font-black leading-none">{partner.name}</p>
              {/* Last workout */}
              {partner.lastWorkout ? (
                <p className="text-[11px] text-muted-foreground/50 mt-1">
                  Last: {WORKOUT_SHORT[partner.lastWorkout.type] ?? partner.lastWorkout.type}
                  {partner.lastWorkout.distance ? ` · ${partner.lastWorkout.distance}mi` : ""}
                  {" · "}
                  {daysSince === 0 ? "today ✓" : daysSince === 1 ? "yesterday" : `${daysSince}d ago`}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground/40 mt-1">No workouts logged yet</p>
              )}
            </div>

            <div className="text-right shrink-0 space-y-1">
              {partner.weekReadiness !== null && (
                <div>
                  <p className="text-[22px] font-black leading-none tabular-nums" style={{ color: readinessColor(partner.weekReadiness) }}>
                    {partner.weekReadiness}%
                  </p>
                  <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider">this week</p>
                </div>
              )}
              {partner.whoopRecovery !== null && (
                <p className="text-[11px] font-semibold tabular-nums" style={{ color: recoveryColor(partner.whoopRecovery) }}>
                  {Math.round(partner.whoopRecovery)}% recovery
                </p>
              )}
            </div>
          </div>

          {/* Accountability nudge */}
          {daysSince !== null && daysSince >= 4 && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.2)" }}>
              <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#FFB800" }} />
              <p className="text-[11px]" style={{ color: "#FFB800" }}>
                {partner.name} hasn&apos;t logged a workout in {daysSince} days.
              </p>
            </div>
          )}

          {/* Combined HYROX prediction */}
          {combinedPrediction ? (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem" }}>
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                Combined HYROX Prediction
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[2rem] font-black leading-none tabular-nums" style={{ color: "#00E87A" }}>
                  {combinedPrediction.formatted}
                </span>
                <span className="text-[10px] text-muted-foreground/35 uppercase tracking-wider">
                  {combinedPrediction.confidence} confidence
                </span>
              </div>
              <div className="space-y-1">
                {combinedPrediction.yourPace && (
                  <p className="text-[11px] text-muted-foreground/50">
                    You: {combinedPrediction.yourPace} · {partner.name}: {combinedPrediction.partnerPace ?? "—"}
                  </p>
                )}
                {combinedPrediction.slowerRunner !== "equal" && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3" style={{ color: "#FFB800" }} />
                    <p className="text-[11px]" style={{ color: "#FFB800" }}>
                      {combinedPrediction.slowerRunner === "you"
                        ? "Your run pace is setting the ceiling — focus on your Zone 2 miles."
                        : `${partner.name}'s run pace is your limiting factor.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem" }}>
              <p className="text-[11px] text-muted-foreground/35">
                Connect Strava on both accounts to see your combined HYROX prediction.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
