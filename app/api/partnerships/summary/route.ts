import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { computeTrainingZones } from "@/lib/strava/zones";
import { predictFinishTime } from "@/lib/plans/readiness";

const HYROX_TYPES = new Set([
  "HYROX", "HYROX_WOMENS", "HYROX_DOUBLES",
  "HYROX_DOUBLES_MIXED", "HYROX_DOUBLES_MENS", "HYROX_DOUBLES_WOMENS",
]);

function secsToHMS(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(secsPerMile: number): string {
  const m = Math.floor(secsPerMile / 60);
  const s = Math.round(secsPerMile % 60);
  return `${m}:${s.toString().padStart(2, "0")}/mi`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  const me = await db.user.findUnique({ where: { id: userId }, select: { email: true } });

  // Find active or pending partnership
  const partnership = await db.partnership.findFirst({
    where: {
      OR: [
        { requesterId: userId, status: { not: "DECLINED" } },
        { partnerId: userId, status: { not: "DECLINED" } },
      ],
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      partner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!partnership) return NextResponse.json({ status: "none" });

  // Determine who is "me" and who is "them"
  const iAmRequester = partnership.requesterId === userId;
  const partnerUser = iAmRequester ? partnership.partner : partnership.requester;

  // Pending received: someone invited me but I haven't accepted
  if (partnership.status === "PENDING" && !iAmRequester) {
    // Check if this invite was for my email
    const myEmail = me?.email?.toLowerCase();
    const matchesEmail = partnership.inviteEmail === myEmail || partnership.partnerId === userId;
    if (matchesEmail) {
      return NextResponse.json({
        status: "pending_received",
        partnershipId: partnership.id,
        inviterName: partnership.requester.name ?? partnership.requester.email,
      });
    }
  }

  // Pending sent: I sent the invite, waiting
  if (partnership.status === "PENDING" && iAmRequester) {
    return NextResponse.json({
      status: "pending_sent",
      partnershipId: partnership.id,
      inviteEmail: partnership.inviteEmail,
      targetName: partnerUser?.name ?? null,
    });
  }

  // Active — fetch partner's training data
  if (!partnerUser) return NextResponse.json({ status: "none" });
  const partnerId = partnerUser.id;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const fourteenAgo = new Date(now.getTime() - 14 * 86400000);

  const [
    partnerLastWorkout,
    partnerWeekWorkouts,
    partnerWhoopRecovery,
    partnerStravaRuns,
    partnerWhoopRunning,
    partnerEvents,
    myStravaRuns,
    myWhoopRunning,
    myEvents,
    myPlan,
  ] = await Promise.all([
    db.workout.findFirst({
      where: { userId: partnerId, status: "COMPLETED", type: { not: "REST" } },
      orderBy: { scheduledDate: "desc" },
      select: { type: true, title: true, scheduledDate: true, status: true, actualDistance: true, targetDistance: true },
    }),
    db.workout.findMany({
      where: { userId: partnerId, scheduledDate: { gte: weekAgo }, type: { not: "REST" } },
      select: { status: true, type: true },
    }),
    db.whoopRecovery.findFirst({
      where: { userId: partnerId },
      orderBy: { date: "desc" },
      select: { recoveryScore: true },
    }),
    db.stravaActivity.findMany({
      where: { userId: partnerId, type: { in: ["Run", "VirtualRun", "TrailRun"] } },
      select: { distance: true, movingTime: true, averageSpeed: true, averageHeartrate: true, maxHeartrate: true, startDate: true },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
    db.whoopActivity.findMany({
      where: { userId: partnerId, sportName: "Running" },
      select: { startDate: true, avgHeartRate: true, maxHeartRate: true },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
    db.event.findMany({
      where: { userId: partnerId, isActive: true },
      select: { type: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.stravaActivity.findMany({
      where: { userId, type: { in: ["Run", "VirtualRun", "TrailRun"] } },
      select: { distance: true, movingTime: true, averageSpeed: true, averageHeartrate: true, maxHeartrate: true, startDate: true },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
    db.whoopActivity.findMany({
      where: { userId, sportName: "Running" },
      select: { startDate: true, avgHeartRate: true, maxHeartRate: true },
      orderBy: { startDate: "desc" },
      take: 100,
    }),
    db.event.findMany({
      where: { userId, isActive: true },
      select: { type: true, date: true },
      orderBy: { date: "asc" },
    }),
    // My plan compliance for last 14 days
    db.workout.findMany({
      where: { userId, scheduledDate: { gte: fourteenAgo }, type: { not: "REST" } },
      select: { status: true },
    }),
  ]);

  // Partner week readiness
  const partnerNonRest = partnerWeekWorkouts.length;
  const partnerCompleted = partnerWeekWorkouts.filter(w => w.status === "COMPLETED").length;
  const partnerWeekReadiness = partnerNonRest > 0
    ? Math.round((partnerCompleted / partnerNonRest) * 100)
    : null;

  // Days since partner's last workout
  const daysSinceLast = partnerLastWorkout
    ? Math.floor((now.getTime() - partnerLastWorkout.scheduledDate.getTime()) / 86400000)
    : null;

  // Compute training zones for both
  const partnerZones = computeTrainingZones(partnerStravaRuns, partnerWhoopRunning);
  const myZones = computeTrainingZones(myStravaRuns, myWhoopRunning);

  // My compliance for combined prediction
  const myCompleted = myPlan.filter(w => w.status === "COMPLETED").length;
  const myCompliancePct = myPlan.length > 0 ? Math.round((myCompleted / myPlan.length) * 100) : 50;

  // Partner compliance
  const partnerCompliance14 = await db.workout.findMany({
    where: { userId: partnerId, scheduledDate: { gte: fourteenAgo }, type: { not: "REST" } },
    select: { status: true },
  });
  const partnerCompliancePct = partnerCompliance14.length > 0
    ? Math.round((partnerCompliance14.filter(w => w.status === "COMPLETED").length / partnerCompliance14.length) * 100)
    : 50;

  // Combined HYROX prediction
  let combinedPrediction: {
    formatted: string;
    confidence: string;
    slowerRunner: "you" | "partner" | "equal";
    yourPace: string | null;
    partnerPace: string | null;
  } | null = null;

  const myHyroxEvent = myEvents.find(e => HYROX_TYPES.has(e.type));
  const partnerHyroxEvent = partnerEvents.find(e => HYROX_TYPES.has(e.type));
  const eventType = myHyroxEvent?.type ?? partnerHyroxEvent?.type ?? "HYROX_DOUBLES";

  if (myZones.thresholdSecsPerMile && partnerZones.thresholdSecsPerMile) {
    const myThresh = myZones.thresholdSecsPerMile;
    const partnerThresh = partnerZones.thresholdSecsPerMile;

    // Running: slower pace determines both partners' run time
    const slowerThresh = Math.max(myThresh, partnerThresh);
    const threshPerKm = slowerThresh / 1.609;
    const hyroxKmPace = threshPerKm + 20;
    const runSecs = 8 * hyroxKmPace;

    // Stations: average fitness of both (each does ~4 stations)
    const avgMiles = (myZones.avgWeeklyMiles + partnerZones.avgWeeklyMiles) / 2;
    const avgCompliance = (myCompliancePct + partnerCompliancePct) / 2;
    let stationSecs =
      avgMiles >= 35 ? 30 * 60
      : avgMiles >= 25 ? 36 * 60
      : avgMiles >= 15 ? 43 * 60
      : 50 * 60;
    stationSecs = Math.round(stationSecs * 0.55); // doubles split
    if (avgCompliance < 60) stationSecs += 5 * 60;
    else if (avgCompliance < 75) stationSecs += 150;

    const totalSecs = Math.round(runSecs + stationSecs);
    const combinedRunCount = myZones.runCount + partnerZones.runCount;

    combinedPrediction = {
      formatted: secsToHMS(totalSecs),
      confidence: combinedRunCount >= 20 ? "medium" : "low",
      slowerRunner: myThresh > partnerThresh ? "you" : myThresh < partnerThresh ? "partner" : "equal",
      yourPace: formatPace(myThresh / 1.609 + 20),
      partnerPace: formatPace(partnerThresh / 1.609 + 20),
    };
  } else if (myZones.thresholdSecsPerMile || partnerZones.thresholdSecsPerMile) {
    // Only one partner has Strava — fall back to single prediction
    const singlePrediction = predictFinishTime({
      eventType,
      thresholdSecsPerMile: myZones.thresholdSecsPerMile ?? partnerZones.thresholdSecsPerMile,
      avgWeeklyMiles: myZones.avgWeeklyMiles || partnerZones.avgWeeklyMiles,
      runCount: myZones.runCount + partnerZones.runCount,
      compliancePct: (myCompliancePct + partnerCompliancePct) / 2,
    });
    if (singlePrediction) {
      combinedPrediction = {
        formatted: singlePrediction.formatted,
        confidence: "low",
        slowerRunner: myZones.thresholdSecsPerMile ? "partner" : "you",
        yourPace: myZones.thresholdSecsPerMile ? formatPace(myZones.thresholdSecsPerMile / 1.609 + 20) : null,
        partnerPace: partnerZones.thresholdSecsPerMile ? formatPace(partnerZones.thresholdSecsPerMile / 1.609 + 20) : null,
      };
    }
  }

  return NextResponse.json({
    status: "active",
    partnershipId: partnership.id,
    partner: {
      name: partnerUser.name ?? partnerUser.email,
      lastWorkout: partnerLastWorkout ? {
        type: partnerLastWorkout.type,
        title: partnerLastWorkout.title,
        date: partnerLastWorkout.scheduledDate.toISOString(),
        distance: partnerLastWorkout.actualDistance ?? partnerLastWorkout.targetDistance ?? null,
      } : null,
      daysSinceLastWorkout: daysSinceLast,
      weekReadiness: partnerWeekReadiness,
      whoopRecovery: partnerWhoopRecovery?.recoveryScore ?? null,
    },
    combinedPrediction,
  });
}
