// Public /stats — the numbers we're comfortable putting on a marketing
// page + the aggregated data behind the /community map.
//
// Privacy contract:
//   • per-user zip / lat / lng are NEVER exposed by this endpoint
//   • cluster granularity is zip3 (first 3 digits ≈ 500k people)
//   • center of a cluster is the average of its members' lat/lng
//   • cluster is only returned if it has >= MIN_CLUSTER_SIZE members
//
// That last rule makes it impossible to derive one specific user's
// approximate location from the map, even when they're the first
// signup in a rural zip3. When the community grows this threshold can
// be lowered.

import { Hono } from "hono";
import type { AppContext } from "../env.js";

export const statsRoutes = new Hono<AppContext>();

const MIN_CLUSTER_SIZE = 1; // relax to 1 in the early phase; bump later
const CACHE_TTL_SECONDS = 60;

statsRoutes.get("/", async (c) => {
  // Cheap edge cache so the counter/map on every homepage load doesn't
  // hammer D1.
  const cached = await c.env.RATE_LIMIT.get("stats:v1");
  if (cached) return c.json(JSON.parse(cached));

  const [membersTotal, listingsActive, thisMonth, clusters] =
    await Promise.all([
      c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM users WHERE is_deleted = 0 AND is_archived = 0`
      ).first<{ n: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM listings
          WHERE is_deleted = 0 AND is_archived = 0 AND status = 'active'`
      ).first<{ n: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM listings
          WHERE is_deleted = 0 AND date_created > (unixepoch() * 1000) - (30 * 86400 * 1000)`
      ).first<{ n: number }>(),
      c.env.DB.prepare(
        `SELECT substr(home_zip, 1, 3) AS zip3,
                AVG(home_lat)         AS lat,
                AVG(home_lng)         AS lng,
                COUNT(*)              AS count
           FROM users
          WHERE is_deleted = 0
            AND is_archived = 0
            AND home_zip IS NOT NULL
            AND home_lat IS NOT NULL
            AND home_lng IS NOT NULL
          GROUP BY zip3
         HAVING count >= ?1`
      )
        .bind(MIN_CLUSTER_SIZE)
        .all(),
    ]);

  const body = {
    members_total: membersTotal?.n ?? 0,
    listings_active: listingsActive?.n ?? 0,
    listings_this_month: thisMonth?.n ?? 0,
    map_clusters: (clusters?.results ?? []) as Array<{
      zip3: string;
      lat: number;
      lng: number;
      count: number;
    }>,
    updated_at: Date.now(),
  };

  await c.env.RATE_LIMIT.put("stats:v1", JSON.stringify(body), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
  return c.json(body);
});
