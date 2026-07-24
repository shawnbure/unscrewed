// Server-side ZIP → (lat, lng) lookup via OpenStreetMap Nominatim.
// Wrapped with a 30-day KV cache; used by /auth/signup and /me/zip so
// user rows carry an approximate location we can aggregate for the
// /community map.
//
// The wider Nominatim proxy at /geocode/search stays intact — it
// handles freeform address autocomplete for listing creation and
// carries its own rate limit.

import type { Env } from "../env.js";

const UA = "unscrewed.lol/1.0 (https://unscrewed.lol; smb@workrr.ai)";

export interface GeoPoint {
  lat: number;
  lng: number;
}

const CACHE_TTL = 60 * 60 * 24 * 30; // 30 days
const CACHE_KEY = (zip: string) => `geo:zip5:${zip}`;

export async function geocodeUsZip(
  env: Env,
  zip: string
): Promise<GeoPoint | null> {
  if (!/^\d{5}$/.test(zip)) return null;

  const cached = await env.RATE_LIMIT.get(CACHE_KEY(zip));
  if (cached) {
    try {
      return JSON.parse(cached) as GeoPoint;
    } catch {
      /* fall through */
    }
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("postalcode", zip);
  url.searchParams.set("country", "US");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  let resp: Response;
  try {
    resp = await fetch(url.toString(), {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "en",
      },
      cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
    } as any);
  } catch {
    return null;
  }
  if (!resp.ok) return null;
  const rows = ((await resp.json().catch(() => [])) as any[]) ?? [];
  const r = rows[0];
  if (!r?.lat || !r?.lon) return null;
  const out: GeoPoint = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
  if (!Number.isFinite(out.lat) || !Number.isFinite(out.lng)) return null;

  await env.RATE_LIMIT.put(CACHE_KEY(zip), JSON.stringify(out), {
    expirationTtl: CACHE_TTL,
  });
  return out;
}
