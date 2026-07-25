import { Hono } from "hono";
import { AttributionSchema } from "@unscrewed/shared";
import { getDb, growthVisits } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { uuidv4 } from "../lib/crypto.js";
import { rateLimit } from "../lib/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";

export const growthRoutes = new Hono<AppContext>();

const UMASS_CENTER = { lat: 42.389326, lng: -72.528361 };
const UMASS_RADIUS_KM = 20;
const FIRST_SPRINT_TARGETS = {
  foundingTraders: 5,
  activeListings: 10,
  twoSidedConversations: 3,
  completedTrades: 1,
} as const;

function umassBounds() {
  const latitudeDelta = UMASS_RADIUS_KM / 111.32;
  const longitudeScale = Math.max(
    Math.cos((UMASS_CENTER.lat * Math.PI) / 180),
    0.1
  );
  const longitudeDelta = UMASS_RADIUS_KM / (111.32 * longitudeScale);
  return [
    Math.max(-90, UMASS_CENTER.lat - latitudeDelta),
    Math.min(90, UMASS_CENTER.lat + latitudeDelta),
    Math.max(-180, UMASS_CENTER.lng - longitudeDelta),
    Math.min(180, UMASS_CENTER.lng + longitudeDelta),
  ] as const;
}

growthRoutes.get("/umass-progress", async (c) => {
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
    .bind(...umassBounds())
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

growthRoutes.get("/umass-me", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const bounds = umassBounds();
  const localListingsSql = `
    SELECT id, user_id, title, wants, status, date_created
      FROM listings
     WHERE is_deleted = 0
       AND is_archived = 0
       AND ROUND(lat, 1) BETWEEN ?1 AND ?2
       AND ROUND(lng, 1) BETWEEN ?3 AND ?4`;

  const [summary, listingRows] = await Promise.all([
    c.env.DB.prepare(
      `WITH local_listings AS (${localListingsSql}),
       mine AS (
         SELECT * FROM local_listings WHERE user_id = ?5
       ),
       my_conversations AS (
         SELECT n.id
           FROM negotiations n
           JOIN local_listings l ON l.id = n.listing_id
           JOIN negotiation_messages m ON m.negotiation_id = n.id
          WHERE n.is_deleted = 0
            AND (n.lister_user_id = ?5 OR n.requester_user_id = ?5)
          GROUP BY n.id
         HAVING COUNT(DISTINCT m.sender_user_id) >= 2
       )
       SELECT
         (SELECT COUNT(*) FROM mine) AS posted_listings,
         (SELECT COUNT(*) FROM mine WHERE status = 'active')
           AS active_listings,
         (SELECT COUNT(*) FROM my_conversations)
           AS two_sided_conversations,
         (SELECT COUNT(*)
            FROM contracts c
            JOIN local_listings l ON l.id = c.listing_id
           WHERE c.status = 'signed'
             AND (c.party_a_user_id = ?5 OR c.party_b_user_id = ?5))
           AS completed_trades`
    )
      .bind(...bounds, userId)
      .first<{
        posted_listings: number;
        active_listings: number;
        two_sided_conversations: number;
        completed_trades: number;
      }>(),
    c.env.DB.prepare(
      `WITH local_listings AS (${localListingsSql})
       SELECT id, title, wants
         FROM local_listings
        WHERE user_id = ?5
          AND status = 'active'
        ORDER BY date_created DESC
        LIMIT 10`
    )
      .bind(...bounds, userId)
      .all<{ id: string; title: string; wants: string }>(),
  ]);

  c.header("Cache-Control", "private, no-store");
  return c.json({
    current: {
      postedListings: summary?.posted_listings ?? 0,
      activeListings: summary?.active_listings ?? 0,
      twoSidedConversations: summary?.two_sided_conversations ?? 0,
      completedTrades: summary?.completed_trades ?? 0,
    },
    activeListings: listingRows.results,
  });
});

growthRoutes.get("/listing/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const isAdmin = c.get("isAdmin") === true;
  const listingId = c.req.param("id");
  const listing = await c.env.DB.prepare(
    `SELECT
       l.user_id,
       u.email_verified_at,
       u.trade_email_notifications
       FROM listings l
       JOIN users u ON u.id = l.user_id
      WHERE l.id = ?1
        AND l.is_deleted = 0
        AND u.is_deleted = 0
      LIMIT 1`
  )
    .bind(listingId)
    .first<{
      user_id: string;
      email_verified_at: number | null;
      trade_email_notifications: number;
    }>();

  if (!listing) return c.json({ error: "not_found" }, 404);
  if (!isAdmin && listing.user_id !== userId)
    return c.json({ error: "forbidden" }, 403);

  const campaign = `share_a_trade:${listingId}`;
  const summary = await c.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*)
          FROM growth_visits
         WHERE source = 'listing_share'
           AND medium = 'share'
           AND campaign = ?1) AS unique_visitors,
       (SELECT COUNT(*)
          FROM users
         WHERE is_deleted = 0
           AND attribution_source = 'listing_share'
           AND attribution_medium = 'share'
           AND attribution_campaign = ?1) AS attributed_members,
       (SELECT COUNT(*)
          FROM negotiations
         WHERE listing_id = ?2
           AND is_deleted = 0) AS proposals,
       (SELECT COUNT(*)
          FROM negotiations n
         WHERE n.listing_id = ?2
           AND n.is_deleted = 0
           AND (
             SELECT COUNT(DISTINCT m.sender_user_id)
               FROM negotiation_messages m
              WHERE m.negotiation_id = n.id
           ) >= 2) AS two_sided_conversations,
       (SELECT COUNT(*)
          FROM contracts
         WHERE listing_id = ?2
           AND status = 'signed') AS completed_trades`
  )
    .bind(campaign, listingId)
    .first<{
      unique_visitors: number;
      attributed_members: number;
      proposals: number;
      two_sided_conversations: number;
      completed_trades: number;
    }>();

  c.header("Cache-Control", "private, no-store");
  return c.json({
    current: {
      uniqueVisitors: summary?.unique_visitors ?? 0,
      attributedMembers: summary?.attributed_members ?? 0,
      proposals: summary?.proposals ?? 0,
      twoSidedConversations: summary?.two_sided_conversations ?? 0,
      completedTrades: summary?.completed_trades ?? 0,
    },
    attribution: {
      source: "listing_share",
      medium: "share",
      campaign,
    },
    ownerAlertReadiness: {
      viewerIsOwner: listing.user_id === userId,
      emailVerified: listing.email_verified_at !== null,
      notificationsEnabled: listing.trade_email_notifications === 1,
    },
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
