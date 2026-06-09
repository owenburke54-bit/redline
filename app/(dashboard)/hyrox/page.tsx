import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { daysUntil, formatDate } from "@/lib/utils";
import {
  computeStationReadiness,
  computePartnerStrategy,
  formatHyroxTime,
} from "@/lib/hyrox/computeHyroxReadiness";
import { StationReadinessGrid } from "@/components/hyrox/StationReadinessGrid";
import { WeaknessRadar } from "@/components/hyrox/WeaknessRadar";
import { SplitTargets } from "@/components/hyrox/SplitTargets";
import { PartnerStrategyCard } from "@/components/hyrox/PartnerStrategy";
import { HideHyroxButton } from "@/components/hyrox/HideHyroxButton";

function EventTypeBadge({ type }: { type: string }) {
  const label = type.includes("DOUBLES_MIXED")
    ? "Mixed Doubles"
    : type.includes("DOUBLES_MENS")
    ? "Men's Doubles"
    : type.includes("DOUBLES_WOMENS")
    ? "Women's Doubles"
    : type.includes("DOUBLES")
    ? "Doubles"
    : type === "HYROX_WOMENS"
    ? "Women's Open"
    : "Open";

  return (
    <span
      className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded"
      style={{ background: "rgba(255,85,0,0.12)", color: "#FF5500" }}
    >
      {label}
    </span>
  );
}

export default async function HyroxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id as string;

  const d42 = new Date();
  d42.setDate(d42.getDate() - 42);

  const [event, athleteModel, recentWorkouts, latestIntelligence] = await Promise.all([
    db.event.findFirst({
      where: {
        userId,
        isActive: true,
        type: { in: ["HYROX", "HYROX_WOMENS", "HYROX_DOUBLES", "HYROX_DOUBLES_MIXED", "HYROX_DOUBLES_MENS", "HYROX_DOUBLES_WOMENS"] },
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
      select: { id: true, name: true, type: true, date: true, location: true, goalTime: true },
    }),
    db.athleteModel.findUnique({
      where: { userId },
      select: {
        ctl: true,
        complianceRate28d: true,
        projectedHyroxTime: true,
        stationReadiness: true,
      },
    }),
    db.workout.findMany({
      where: {
        userId,
        type: { in: ["HYROX_STATION_WORK", "HYROX_SIM", "STRENGTH"] },
        scheduledDate: { gte: d42 },
      },
      select: {
        status: true,
        type: true,
        title: true,
        description: true,
        perceivedEffort: true,
      },
    }),
    db.hyroxIntelligence.findFirst({
      where: { userId },
      orderBy: { weekStart: "desc" },
      select: {
        raceDayBrief: true,
        partnerNotes: true,
        weekStart: true,
        stationAdvice: true,
        weaknessInterventions: true,
      },
    }),
  ]);

  if (!event) redirect("/");

  const stationReadiness = computeStationReadiness({
    ctl: athleteModel?.ctl ?? null,
    complianceRate28d: athleteModel?.complianceRate28d ?? null,
    recentWorkouts,
  });

  const partnerStrategy = computePartnerStrategy({
    owenReadiness: stationReadiness,
    victoriaReadiness: null,
    owenCtl: athleteModel?.ctl ?? null,
    victoriaCtl: null,
  });

  const daysLeft = daysUntil(event.date);
  const projectedSecs = athleteModel?.projectedHyroxTime ?? null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Race header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <EventTypeBadge type={event.type} />
            </div>
            <h1 className="text-[1.6rem] font-black tracking-tight leading-tight text-foreground">
              {event.name}
            </h1>
            {event.location && (
              <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                {event.location}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p
              className="text-[2.8rem] font-black leading-none tabular-nums"
              style={{ color: daysLeft <= 14 ? "#FF5500" : daysLeft <= 42 ? "#FFB800" : "#00E87A" }}
            >
              {daysLeft}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>
              days out
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
              {formatDate(event.date)}
            </p>
          </div>
        </div>

        {/* Projected time */}
        {projectedSecs != null && (
          <div
            className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                Projected finish
              </p>
              <p className="text-[1.4rem] font-black tabular-nums mt-0.5" style={{ color: "#FFB800" }}>
                {formatHyroxTime(projectedSecs)}
              </p>
            </div>
            {event.goalTime && (
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Goal
                </p>
                <p className="text-[1.4rem] font-black tabular-nums mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {event.goalTime}
                </p>
              </div>
            )}
            {!event.goalTime && (
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Target
                </p>
                <p className="text-[1.4rem] font-black tabular-nums mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  1:15:00
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Station readiness */}
      <StationReadinessGrid stationReadiness={stationReadiness} />

      {/* Weakness focus areas */}
      <WeaknessRadar stationReadiness={stationReadiness} />

      {/* Split targets */}
      <SplitTargets
        stationReadiness={stationReadiness}
        projectedTotalSecs={projectedSecs}
      />

      {/* Partner strategy */}
      <PartnerStrategyCard strategy={partnerStrategy} />

      {/* Race intelligence (AI-generated, if available) */}
      {latestIntelligence && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground/40 uppercase">
              Race Intelligence
            </p>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
              Week of {formatDate(latestIntelligence.weekStart)}
            </span>
          </div>
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(255,85,0,0.04)", border: "1px solid rgba(255,85,0,0.12)" }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              {latestIntelligence.raceDayBrief}
            </p>
            {latestIntelligence.partnerNotes && (
              <>
                <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,85,0,0.6)" }}>
                    Partner Notes
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {latestIntelligence.partnerNotes}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Settings footer */}
      <div className="flex items-center justify-between pb-4">
        <HideHyroxButton />
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>
          Updated when your plan runs
        </p>
      </div>
    </div>
  );
}
