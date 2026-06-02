import { db } from "@/lib/db";
import { fetchDailySummaries, fetchSleepData } from "./client";

export async function syncGarminData(userId: string, daysBack = 30): Promise<{ summaries: number }> {
  const end = new Date();
  const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const [dailies, sleeps] = await Promise.all([
    fetchDailySummaries(userId, start, end),
    fetchSleepData(userId, start, end),
  ]);

  const sleepByDate = new Map(sleeps.map(s => [s.calendarDate, s]));

  let synced = 0;

  for (const d of dailies) {
    const date = new Date(d.calendarDate + "T00:00:00.000Z");
    const sleep = sleepByDate.get(d.calendarDate);

    await db.garminDailySummary.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        bodyBattery: d.bodyBatteryHighestValue ?? null,
        stressAvg: d.averageStressLevel ?? null,
        restingHr: d.restingHeartRateInBeatsPerMinute ?? null,
        steps: d.steps ?? null,
        sleepScore: sleep?.overallSleepScore ?? null,
        sleepDuration: sleep?.durationInSeconds ? Math.round(sleep.durationInSeconds / 60) : null,
        sleepHrv: sleep?.averageHRV ?? null,
      },
      update: {
        bodyBattery: d.bodyBatteryHighestValue ?? null,
        stressAvg: d.averageStressLevel ?? null,
        restingHr: d.restingHeartRateInBeatsPerMinute ?? null,
        steps: d.steps ?? null,
        sleepScore: sleep?.overallSleepScore ?? null,
        sleepDuration: sleep?.durationInSeconds ? Math.round(sleep.durationInSeconds / 60) : null,
        sleepHrv: sleep?.averageHRV ?? null,
      },
    });
    synced++;
  }

  return { summaries: synced };
}

export type GarminWebhookPayload = {
  dailies?: {
    userAccessToken: string;
    calendarDate: string;
    restingHeartRateInBeatsPerMinute?: number;
    averageStressLevel?: number;
    bodyBatteryHighestValue?: number;
    steps?: number;
  }[];
  sleeps?: {
    userAccessToken: string;
    calendarDate: string;
    durationInSeconds?: number;
    overallSleepScore?: number;
    averageHRV?: number;
  }[];
};

export async function processGarminWebhook(payload: GarminWebhookPayload): Promise<void> {
  // Group incoming data by userAccessToken so we do one DB lookup per user
  const userTokens = new Set<string>();
  payload.dailies?.forEach(d => userTokens.add(d.userAccessToken));
  payload.sleeps?.forEach(s => userTokens.add(s.userAccessToken));

  for (const token of userTokens) {
    const user = await db.user.findFirst({
      where: { garminAccessToken: token },
      select: { id: true },
    });
    if (!user) continue;

    const userId = user.id;

    const dailiesForUser = payload.dailies?.filter(d => d.userAccessToken === token) ?? [];
    const sleepsForUser = payload.sleeps?.filter(s => s.userAccessToken === token) ?? [];
    const sleepByDate = new Map(sleepsForUser.map(s => [s.calendarDate, s]));

    for (const d of dailiesForUser) {
      const date = new Date(d.calendarDate + "T00:00:00.000Z");
      const sleep = sleepByDate.get(d.calendarDate);

      await db.garminDailySummary.upsert({
        where: { userId_date: { userId, date } },
        create: {
          userId,
          date,
          bodyBattery: d.bodyBatteryHighestValue ?? null,
          stressAvg: d.averageStressLevel ?? null,
          restingHr: d.restingHeartRateInBeatsPerMinute ?? null,
          steps: d.steps ?? null,
          sleepScore: sleep?.overallSleepScore ?? null,
          sleepDuration: sleep?.durationInSeconds ? Math.round(sleep.durationInSeconds / 60) : null,
          sleepHrv: sleep?.averageHRV ?? null,
        },
        update: {
          bodyBattery: d.bodyBatteryHighestValue ?? null,
          stressAvg: d.averageStressLevel ?? null,
          restingHr: d.restingHeartRateInBeatsPerMinute ?? null,
          steps: d.steps ?? null,
          sleepScore: sleep?.overallSleepScore ?? null,
          sleepDuration: sleep?.durationInSeconds ? Math.round(sleep.durationInSeconds / 60) : null,
          sleepHrv: sleep?.averageHRV ?? null,
        },
      });
    }

    // Process sleep-only records (no matching daily)
    for (const s of sleepsForUser) {
      if (dailiesForUser.some(d => d.calendarDate === s.calendarDate)) continue;
      const date = new Date(s.calendarDate + "T00:00:00.000Z");

      await db.garminDailySummary.upsert({
        where: { userId_date: { userId, date } },
        create: {
          userId,
          date,
          sleepScore: s.overallSleepScore ?? null,
          sleepDuration: s.durationInSeconds ? Math.round(s.durationInSeconds / 60) : null,
          sleepHrv: s.averageHRV ?? null,
        },
        update: {
          sleepScore: s.overallSleepScore ?? null,
          sleepDuration: s.durationInSeconds ? Math.round(s.durationInSeconds / 60) : null,
          sleepHrv: s.averageHRV ?? null,
        },
      });
    }
  }
}

export function formatGarminContextForCoach(
  todaySummary: {
    bodyBattery: number | null;
    stressAvg: number | null;
    restingHr: number | null;
    sleepScore: number | null;
    sleepDuration: number | null;
    sleepHrv: number | null;
  } | null
): string {
  if (!todaySummary) return "No Garmin data available";

  const lines: string[] = [];

  if (todaySummary.bodyBattery != null) {
    const level =
      todaySummary.bodyBattery >= 70 ? "high — ready to perform"
        : todaySummary.bodyBattery >= 40 ? "moderate readiness"
        : "low — prioritize recovery";
    lines.push(`Body Battery: ${Math.round(todaySummary.bodyBattery)}% (${level})`);
  }

  if (todaySummary.restingHr != null) {
    lines.push(`RHR: ${todaySummary.restingHr}bpm`);
  }

  if (todaySummary.stressAvg != null) {
    lines.push(`Avg stress: ${Math.round(todaySummary.stressAvg)}/100`);
  }

  if (todaySummary.sleepScore != null && todaySummary.sleepDuration != null) {
    const hours = (todaySummary.sleepDuration / 60).toFixed(1);
    lines.push(`Sleep: ${hours}h, score ${Math.round(todaySummary.sleepScore)}/100`);
  }

  if (todaySummary.sleepHrv != null) {
    lines.push(`HRV (sleep): ${Math.round(todaySummary.sleepHrv)}ms`);
  }

  return lines.length > 0 ? lines.join("\n") : "No Garmin data available";
}
