import { db } from "@/lib/db";

const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

// WHOOP sport_id → human-readable name mapping (subset of common ones)
const SPORT_NAMES: Record<number, string> = {
  "-1": "Activity",
  0: "Running",
  1: "Cycling",
  16: "HIIT",
  26: "Yoga",
  27: "Pilates",
  30: "Barre",
  44: "Soccer",
  52: "Swimming",
  54: "Tennis",
  57: "Golf",
  59: "Surfing",
  63: "Basketball",
  64: "Baseball",
  71: "Hiking",
  74: "Functional Fitness",
  82: "Strength Training",
  85: "Rowing",
  86: "Skiing",
  87: "Snowboarding",
  96: "Lacrosse",
  98: "Rugby",
  101: "Martial Arts",
  109: "Volleyball",
  126: "Pickleball",
  127: "Padel",
};

export function sportName(sportId: number): string {
  return SPORT_NAMES[sportId] ?? `Sport ${sportId}`;
}

// Deduplicate concurrent token refreshes — prevents double-refresh when
// fetchWorkouts and fetchRecoveries race in Promise.all with an expired token.
// WHOOP rotates the refresh token on first use, so the second refresh would
// hit a 401 and the first request would use a now-superseded access token.
const refreshInFlight = new Map<string, Promise<string>>();

async function refreshToken(userId: string, refreshToken: string): Promise<string> {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error(`WHOOP token refresh failed: ${res.status}`);

  const data = await res.json();
  const expiry = new Date(Date.now() + data.expires_in * 1000);

  await db.user.update({
    where: { id: userId },
    data: {
      whoopAccessToken: data.access_token,
      whoopRefreshToken: data.refresh_token ?? refreshToken,
      whoopTokenExpiry: expiry,
    },
  });

  return data.access_token;
}

async function getValidToken(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { whoopAccessToken: true, whoopRefreshToken: true, whoopTokenExpiry: true },
  });

  if (!user?.whoopAccessToken || !user?.whoopRefreshToken) {
    throw new Error("WHOOP not connected");
  }

  const isExpired = !user.whoopTokenExpiry || user.whoopTokenExpiry <= new Date(Date.now() + 60_000);
  if (!isExpired) return user.whoopAccessToken;

  const inFlight = refreshInFlight.get(userId);
  if (inFlight) return inFlight;

  const promise = refreshToken(userId, user.whoopRefreshToken).finally(() => {
    refreshInFlight.delete(userId);
  });
  refreshInFlight.set(userId, promise);
  return promise;
}

async function whoopFetch<T>(userId: string, path: string, params?: Record<string, string>, allow404 = false): Promise<T | null> {
  const token = await getValidToken(userId);
  const url = new URL(`${WHOOP_API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404 && allow404) return null;
  if (!res.ok) throw new Error(`WHOOP API error ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export interface WhoopWorkout {
  id: number;
  sport_id: number;
  start: string;
  end: string;
  score?: {
    strain: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
    kilojoule?: number;
  };
}

export interface WhoopRecoveryRecord {
  cycle_id: number;
  created_at: string;
  score?: {
    recovery_score: number;
    hrv_rmssd_milli?: number;
    resting_heart_rate?: number;
    spo2_percentage?: number;
  };
  sleep?: {
    score?: number;
    total_in_bed_time_milli?: number;
  };
}

interface PaginatedResponse<T> {
  records: T[];
  next_token?: string;
}

export async function fetchWorkouts(userId: string, start: Date, end: Date): Promise<WhoopWorkout[]> {
  const all: WhoopWorkout[] = [];
  let nextToken: string | undefined;

  do {
    const params: Record<string, string> = {
      start: start.toISOString(),
      end: end.toISOString(),
      limit: "25",
    };
    if (nextToken) params.nextToken = nextToken;

    const page = await whoopFetch<PaginatedResponse<WhoopWorkout>>(userId, "/activity/workout", params);
    all.push(...page!.records);
    nextToken = page!.next_token;
  } while (nextToken);

  return all;
}

export async function fetchRecoveries(userId: string, start: Date, end: Date): Promise<WhoopRecoveryRecord[]> {
  const all: WhoopRecoveryRecord[] = [];
  let nextToken: string | undefined;

  do {
    const params: Record<string, string> = {
      start: start.toISOString(),
      end: end.toISOString(),
      limit: "25",
    };
    if (nextToken) params.nextToken = nextToken;

    const page = await whoopFetch<PaginatedResponse<WhoopRecoveryRecord>>(userId, "/recovery", params, true);
    if (!page) return all; // 404 = no recovery data yet
    all.push(...page.records);
    nextToken = page.next_token;
  } while (nextToken);

  return all;
}

export async function fetchWorkoutById(userId: string, workoutId: number): Promise<WhoopWorkout> {
  return (await whoopFetch<WhoopWorkout>(userId, `/activity/workout/${workoutId}`))!;
}

export async function fetchRecoveryById(userId: string, cycleId: number): Promise<WhoopRecoveryRecord> {
  return (await whoopFetch<WhoopRecoveryRecord>(userId, `/recovery/${cycleId}`))!;
}

export async function fetchProfile(userId: string): Promise<{ user_id: number }> {
  return (await whoopFetch<{ user_id: number }>(userId, "/user/profile/basic"))!;
}
