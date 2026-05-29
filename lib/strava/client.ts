import { db } from "@/lib/db";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

async function refreshToken(userId: string, refreshToken: string): Promise<string> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);

  const data: StravaTokenResponse = await res.json();
  const expiry = new Date(data.expires_at * 1000);

  await db.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaTokenExpiry: expiry,
    },
  });

  return data.access_token;
}

async function getValidToken(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stravaAccessToken: true, stravaRefreshToken: true, stravaTokenExpiry: true },
  });

  if (!user?.stravaAccessToken || !user?.stravaRefreshToken) {
    throw new Error("Strava not connected");
  }

  const isExpired =
    !user.stravaTokenExpiry || user.stravaTokenExpiry <= new Date(Date.now() + 60_000);
  if (isExpired) return refreshToken(userId, user.stravaRefreshToken);

  return user.stravaAccessToken;
}

export interface StravaActivityRecord {
  id: number;
  type: string;
  name: string;
  distance: number;      // meters
  moving_time: number;   // seconds
  elapsed_time: number;  // seconds
  start_date: string;    // ISO
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number; // m/s
  suffer_score?: number;
}

export async function fetchStravaActivities(
  userId: string,
  after: Date,
  perPage = 100
): Promise<StravaActivityRecord[]> {
  const token = await getValidToken(userId);
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  url.searchParams.set("after", Math.floor(after.getTime() / 1000).toString());
  url.searchParams.set("per_page", String(perPage));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Strava API error ${res.status}`);
  return res.json() as Promise<StravaActivityRecord[]>;
}
