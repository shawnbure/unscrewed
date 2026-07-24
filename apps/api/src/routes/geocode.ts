// Worker-side proxy for OpenStreetMap Nominatim address autocomplete.
//
// Why a proxy?
//   - Nominatim's usage policy requires a real User-Agent identifying the
//     app + an attribution. Browsers can't set User-Agent on fetch, so the
//     Worker does it for us.
//   - We can cache results in KV so we don't hammer their free service.
//   - We can constrain queries to US to keep things simple for v1.
//
// Be a good citizen:
//   - No more than ~1 req/sec/IP (rate-limited via KV).
//   - Cache for 24h.
//
// Returns a small normalized shape so the client doesn't have to know the
// Nominatim schema:
//   [{ id, display, lat, lng, postcode, city, state }]

import { Hono } from "hono";
import type { AppContext } from "../env.js";
import { rateLimit } from "../lib/rateLimit.js";

export const geocodeRoutes = new Hono<AppContext>();

const UA =
  "unscrewed.lol/1.0 (https://unscrewed.lol; smb@workrr.ai)";

geocodeRoutes.get("/search", async (c) => {
  const url = new URL(c.req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return c.json({ items: [] });
  if (q.length > 120) return c.json({ error: "too_long" }, 400);

  // Light rate limit per IP to keep our shared Nominatim quota healthy.
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anon";
  const rl = await rateLimit(c.env, `geo:${ip}`, 30, 60);
  if (!rl.allowed) return c.json({ error: "rate_limited" }, 429);

  const cacheKey = `geo:v1:${q.toLowerCase()}`;
  const cached = await c.env.RATE_LIMIT.get(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  const upstream = new URL("https://nominatim.openstreetmap.org/search");
  upstream.searchParams.set("q", q);
  upstream.searchParams.set("format", "jsonv2");
  upstream.searchParams.set("addressdetails", "1");
  upstream.searchParams.set("countrycodes", "us");
  upstream.searchParams.set("limit", "6");

  let resp: Response;
  try {
    resp = await fetch(upstream.toString(), {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "en",
      },
      // Cloudflare cache on top of our KV cache.
      cf: { cacheTtl: 86400, cacheEverything: true },
    } as any);
  } catch (e) {
    console.warn("[geocode] upstream fetch failed", e);
    return c.json({ items: [] });
  }
  if (!resp.ok) {
    return c.json({ items: [], upstreamStatus: resp.status });
  }
  const raw = ((await resp.json().catch(() => [])) as any[]) ?? [];
  const items = raw.map((r: any) => ({
    id: String(r.place_id),
    display: r.display_name as string,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    postcode: r.address?.postcode ?? null,
    city:
      r.address?.city ??
      r.address?.town ??
      r.address?.village ??
      r.address?.hamlet ??
      null,
    state: r.address?.state ?? null,
    type: r.addresstype ?? r.type ?? null,
  }));

  const body = { items };
  // Cache for a day; cheap on KV.
  await c.env.RATE_LIMIT.put(cacheKey, JSON.stringify(body), {
    expirationTtl: 86400,
  });
  return c.json(body);
});
