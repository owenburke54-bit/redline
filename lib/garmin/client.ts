import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const GARMIN_REQUEST_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
const GARMIN_AUTHORIZE_URL = "https://connect.garmin.com/oauthConfirm";
const GARMIN_ACCESS_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/access_token";
const GARMIN_API_BASE = "https://apis.garmin.com";

function percentEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function hmacSha1Signature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret = ""
): string {
  const normalized = Object.entries(params)
    .map(([k, v]) => [percentEncode(k), percentEncode(v)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const base = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(normalized),
  ].join("&");

  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac("sha1", key).update(base).digest("base64");
}

function buildAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  tokenKey = "",
  tokenSecret = "",
  extraParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };
  if (tokenKey) oauthParams.oauth_token = tokenKey;

  const sig = hmacSha1Signature(
    method,
    url,
    { ...oauthParams, ...extraParams },
    consumerSecret,
    tokenSecret
  );

  return (
    "OAuth " +
    Object.entries({ ...oauthParams, oauth_signature: sig })
      .map(([k, v]) => `${k}="${percentEncode(v)}"`)
      .join(", ")
  );
}

export function getAuthorizeUrl(oauthToken: string): string {
  return `${GARMIN_AUTHORIZE_URL}?oauth_token=${encodeURIComponent(oauthToken)}`;
}

export async function getRequestToken(): Promise<{ token: string; tokenSecret: string }> {
  const consumerKey = process.env.GARMIN_CONSUMER_KEY!;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET!;
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/garmin/callback`;

  const url = GARMIN_REQUEST_TOKEN_URL;
  const header = buildAuthHeader("POST", url, consumerKey, consumerSecret, "", "", {
    oauth_callback: callbackUrl,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: header },
  });

  if (!res.ok) throw new Error(`Garmin request token failed: ${res.status}`);

  const params = new URLSearchParams(await res.text());
  return {
    token: params.get("oauth_token")!,
    tokenSecret: params.get("oauth_token_secret")!,
  };
}

export async function exchangeAccessToken(
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): Promise<{ token: string; tokenSecret: string; userId: string | null }> {
  const consumerKey = process.env.GARMIN_CONSUMER_KEY!;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET!;

  const url = GARMIN_ACCESS_TOKEN_URL;
  const header = buildAuthHeader("POST", url, consumerKey, consumerSecret, requestToken, requestTokenSecret, {
    oauth_verifier: verifier,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: header },
  });

  if (!res.ok) throw new Error(`Garmin access token failed: ${res.status}`);

  const params = new URLSearchParams(await res.text());
  return {
    token: params.get("oauth_token")!,
    tokenSecret: params.get("oauth_token_secret")!,
    userId: params.get("user_id") ?? null,
  };
}

async function garminGet<T>(
  userId: string,
  path: string,
  queryParams: Record<string, string> = {}
): Promise<T> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { garminAccessToken: true, garminAccessTokenSecret: true },
  });

  if (!user?.garminAccessToken || !user?.garminAccessTokenSecret) {
    throw new Error("Garmin not connected");
  }

  const consumerKey = process.env.GARMIN_CONSUMER_KEY!;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET!;

  const url = new URL(`${GARMIN_API_BASE}${path}`);
  Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));

  // OAuth 1.0a: sign over base URL (no query string) with query params included in signature
  const header = buildAuthHeader(
    "GET",
    `${url.origin}${url.pathname}`,
    consumerKey,
    consumerSecret,
    user.garminAccessToken,
    user.garminAccessTokenSecret,
    queryParams
  );

  const res = await fetch(url.toString(), {
    headers: { Authorization: header },
  });

  if (!res.ok) throw new Error(`Garmin API ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export interface GarminDailySummaryRecord {
  calendarDate: string;
  restingHeartRateInBeatsPerMinute?: number;
  averageStressLevel?: number;
  bodyBatteryHighestValue?: number;
  bodyBatteryLowestValue?: number;
  steps?: number;
}

export interface GarminSleepRecord {
  calendarDate: string;
  durationInSeconds?: number;
  overallSleepScore?: number;
  averageHRV?: number;
}

export async function fetchDailySummaries(
  userId: string,
  start: Date,
  end: Date
): Promise<GarminDailySummaryRecord[]> {
  const params = {
    uploadStartTimeInSeconds: Math.floor(start.getTime() / 1000).toString(),
    uploadEndTimeInSeconds: Math.floor(end.getTime() / 1000).toString(),
  };
  const data = await garminGet<{ summaries?: GarminDailySummaryRecord[] }>(userId, "/wellness-api/rest/dailies", params);
  return data.summaries ?? [];
}

export async function fetchSleepData(
  userId: string,
  start: Date,
  end: Date
): Promise<GarminSleepRecord[]> {
  const params = {
    uploadStartTimeInSeconds: Math.floor(start.getTime() / 1000).toString(),
    uploadEndTimeInSeconds: Math.floor(end.getTime() / 1000).toString(),
  };
  const data = await garminGet<{ sleeps?: GarminSleepRecord[] }>(userId, "/wellness-api/rest/sleeps", params);
  return data.sleeps ?? [];
}
