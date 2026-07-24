import { Hono } from "hono";
import { AttributionSchema } from "@unscrewed/shared";
import { getDb, growthVisits } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { uuidv4 } from "../lib/crypto.js";
import { rateLimit } from "../lib/rateLimit.js";

export const growthRoutes = new Hono<AppContext>();

const UMASS_CENTER = { lat: 42.389326, lng: -72.528361 };
const UMASS_RADIUS_KM = 20;
const FIRST_SPRINT_TARGETS = {
  foundingTraders: 5,
  activeListings: 10,
  twoSidedConversations: 3,
  completedTrades: 1,
} as const;

growthRoutes.get("/umass-progress", async (c) => {
  const latitudeDelta = UMASS_RADIUS_KM / 111.32;
  const longitudeScale = Math.max(
    Math.cos((UMASS_CENTER.lat * Math.PI) / 180),
    0.1
  );
  const longitudeDelta =
    UMASS_RADIUS_KM / (111.32 * longitudeScale);

  const row = await c.env.DB.prepare(
    `WITH local_listings AS (
       SELECT id, user_id, status
         FROM listings
        WHERE is_deleted = 0
          AND is_archived = 0
          AND ROUND(lat, 1) BETWEEN ?1 AND ?2
          AND ROUND(lng, 1) BETWEEN ?3 AND ?4
     ),
     local_conversations AS (
       SELECT n.id
         FROM negotiations n
         JOIN local_listings l ON l.id = n.listing_id
         JOIN negotiation_messages m ON m.negotiation_id = n.id
        WHERE n.is_deleted = 0
        GROUP BY n.id
       HAVING COUNT(DISTINCT m.sender_user_id) >= 2
     )
     SELECT
       (SELECT COUNT(DISTINCT user_id) FROM local_listings)
         AS founding_traders,
       (SELECT COUNT(*) FROM local_listings WHERE status = 'active')
         AS active_listings,
       (SELECT COUNT(*) FROM local_conversations)
         AS two_sided_conversations,
       (SELECT COUNT(*)
          FROM contracts c
          JOIN local_listings l ON l.id = c.listing_id
         WHERE c.status = 'signed')
         AS completed_trades`
  )
    .bind(
      Math.max(-90, UMASS_CENTER.lat - latitudeDelta),
      Math.min(90, UMASS_CENTER.lat + latitudeDelta),
      Math.max(-180, UMASS_CENTER.lng - longitudeDelta),
      Math.min(180, UMASS_CENTER.lng + longitudeDelta)
    )
    .first<{
      founding_traders: number;
      active_listings: number;
      two_sided_conversations: number;
      completed_trades: number;
    }>();

  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return c.json({
    area: "UMass Amherst area",
    radiusKm: UMASS_RADIUS_KM,
    current: {
      foundingTraders: row?.founding_traders ?? 0,
      activeListings: row?.active_listings ?? 0,
      twoSidedConversations: row?.two_sided_conversations ?? 0,
      completedTrades: row?.completed_trades ?? 0,
    },
    targets: FIRST_SPRINT_TARGETS,
    updatedAt: Date.now(),
  });
});

growthRoutes.post("/visit", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = AttributionSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const rl = await rateLimit(
    c.env,
    `growth-visit:${ip ?? parsed.data.visitorId}`,
    120,
    3600
  );
  if (!rl.allowed) return c.json({ error: "rate_limited" }, 429);

  await getDb(c.env.DB)
    .insert(growthVisits)
    .values({ id: uuidv4(), ...parsed.data })
    .onConflictDoNothing();

  // Keep the anonymous measurement window intentionally short. User account
  // attribution remains with the account, but unconverted visit rows expire.
  await c.env.DB.prepare(
    "DELETE FROM growth_visits WHERE date_created < ?1"
  )
    .bind(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .run();

  return c.json({ ok: true });
});
