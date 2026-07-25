// Public /stats — the numbers we're comfortable putting on a marketing
// page + the aggregated data behind the /community map.
//
// Privacy contract:
//   • per-user zip / lat / lng are NEVER exposed by this endpoint
//   • cluster granularity is zip3 (first 3 digits ≈ 500k people)
//   • marker coordinates are rounded to one decimal after aggregation
//   • cluster is only returned if it has >= MIN_CLUSTER_SIZE members
//
// The threshold prevents one early member from becoming a public location
// marker. Coordinate rounding keeps a qualifying cluster useful as a broad
// visual without publishing a precise average of members' ZIP centroids.

import { Hono } from "hono";
import type { AppContext } from "../env.js";

export const statsRoutes = new Hono<AppContext>();

const MIN_CLUSTER_SIZE = 3;
const CACHE_TTL_SECONDS = 60;
const CACHE_KEY = "stats:v2";

statsRoutes.get("/", async (c) => {
  // Cheap edge cache so the counter/map on every homepage load doesn't
  // hammer D1.
  const cached = await c.env.RATE_LIMIT.get(CACHE_KEY);
  if (cached) return c.json(JSON.parse(cached));

  const [
    membersTotal,
    listingsActive,
    thisMonth,
    twoSidedConversations,
    completedTrades,
    clusters,
  ] =
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
        `SELECT COUNT(*) AS n
           FROM (
             SELECT n.id
               FROM negotiations n
               JOIN negotiation_messages m ON m.negotiation_id = n.id
              WHERE n.is_deleted = 0
              GROUP BY n.id
             HAVING COUNT(DISTINCT m.sender_user_id) >= 2
           )`
      ).first<{ n: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS n
           FROM contracts
          WHERE status = 'signed'`
      ).first<{ n: number }>(),
      c.env.DB.prepare(
        `SELECT substr(home_zip, 1, 3) AS zip3,
                ROUND(AVG(home_lat), 1) AS lat,
                ROUND(AVG(home_lng), 1) AS lng,
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
    two_sided_conversations: twoSidedConversations?.n ?? 0,
    completed_trades: completedTrades?.n ?? 0,
    map_min_cluster_size: MIN_CLUSTER_SIZE,
    map_clusters: (clusters?.results ?? []) as Array<{
      zip3: string;
      lat: number;
      lng: number;
      count: number;
    }>,
    updated_at: Date.now(),
  };

  await c.env.RATE_LIMIT.put(CACHE_KEY, JSON.stringify(body), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
  return c.json(body);
});
