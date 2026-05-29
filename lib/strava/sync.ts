import { db } from "@/lib/db";
import { fetchStravaActivities } from "./client";

export async function syncStravaActivities(userId: string, daysBack = 90): Promise<number> {
  const since = new Date(Date.now() - daysBack * 86_400_000);
  const activities = await fetchStravaActivities(userId, since);

  let upserted = 0;
  for (const a of activities) {
    await db.stravaActivity.upsert({
      where: { stravaId: String(a.id) },
      create: {
        userId,
        stravaId: String(a.id),
        type: a.type,
        name: a.name,
        distance: a.distance,
        movingTime: a.moving_time,
        elapsedTime: a.elapsed_time,
        startDate: new Date(a.start_date),
        averageHeartrate: a.average_heartrate ?? null,
        maxHeartrate: a.max_heartrate ?? null,
        averageSpeed: a.average_speed ?? null,
        effortScore: a.suffer_score ?? null,
      },
      update: {
        name: a.name,
        averageHeartrate: a.average_heartrate ?? null,
        maxHeartrate: a.max_heartrate ?? null,
        averageSpeed: a.average_speed ?? null,
        effortScore: a.suffer_score ?? null,
      },
    });
    upserted++;
  }

  return upserted;
}
