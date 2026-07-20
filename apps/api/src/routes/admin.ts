// Admin moderation API. Requires session with is_admin = 1.
//
// All list endpoints return rows regardless of is_archived / is_deleted state
// so admins can manage them; per-row flags are returned so the UI can render
// status appropriately.

import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  getDb,
  users,
  listings,
  negotiations,
} from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAdmin } from "../middleware/auth.js";
import { geocodeUsZip } from "../lib/geocode.js";

export const adminRoutes = new Hono<AppContext>();
adminRoutes.use("*", requireAdmin);

// ============================================================
// /admin/stats — counts + recent activity
// ============================================================
adminRoutes.get("/stats", async (c) => {
  const db = c.env.DB;
  const [
    totalUsers,
    activeUsers,
    deletedUsers,
    archivedUsers,
    totalListings,
    activeListings,
    deletedListings,
    archivedListings,
    totalNegotiations,
    recentSignups,
    growthFunnel,
  ] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM users WHERE is_deleted = 0 AND is_archived = 0")
      .first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM users WHERE is_deleted = 1").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM users WHERE is_archived = 1").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM listings").first<{ n: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM listings WHERE is_deleted = 0 AND status = 'active'")
      .first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM listings WHERE is_deleted = 1").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM listings WHERE is_archived = 1").first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM negotiations").first<{ n: number }>(),
    db
      .prepare(
        "SELECT id, email, display_name, date_created FROM users ORDER BY date_created DESC LIMIT 5"
      )
      .all(),
    db
      .prepare(
        `SELECT
           gv.campaign,
           gv.source,
           gv.medium,
           COUNT(DISTINCT gv.visitor_id) AS visitors,
           COUNT(DISTINCT u.id) AS signups,
           COUNT(DISTINCT CASE WHEN activated.user_id IS NOT NULL THEN u.id END) AS first_listings
         FROM growth_visits gv
         LEFT JOIN users u
           ON u.attribution_visitor_id = gv.visitor_id
          AND u.attribution_campaign = gv.campaign
          AND u.is_deleted = 0
         LEFT JOIN (
           SELECT DISTINCT user_id FROM listings WHERE is_deleted = 0
         ) activated ON activated.user_id = u.id
         WHERE gv.date_created >= ?1
         GROUP BY gv.campaign, gv.source, gv.medium
         ORDER BY visitors DESC
         LIMIT 10`
      )
      .bind(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .all(),
  ]);
  return c.json({
    users: {
      total: totalUsers?.n ?? 0,
      active: activeUsers?.n ?? 0,
      archived: archivedUsers?.n ?? 0,
      deleted: deletedUsers?.n ?? 0,
    },
    listings: {
      total: totalListings?.n ?? 0,
      active: activeListings?.n ?? 0,
      archived: archivedListings?.n ?? 0,
      deleted: deletedListings?.n ?? 0,
    },
    negotiations: { total: totalNegotiations?.n ?? 0 },
    recentSignups: recentSignups.results,
    growth: {
      windowDays: 30,
      campaigns: growthFunnel.results,
    },
  });
});

// ============================================================
// /admin/users
// ============================================================
const UserListQuery = z.object({
  q: z.string().optional(),
  status: z.enum(["active", "archived", "deleted", "all"]).default("active"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

adminRoutes.get("/users", async (c) => {
  const raw: Record<string, string> = {};
  new URL(c.req.url).searchParams.forEach((v, k) => (raw[k] = v));
  const parsed = UserListQuery.safeParse(raw);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const { q, status, limit } = parsed.data;

  const where: string[] = [];
  const binds: any[] = [];
  if (status === "active") where.push("is_deleted = 0 AND is_archived = 0");
  else if (status === "archived") where.push("is_archived = 1 AND is_deleted = 0");
  else if (status === "deleted") where.push("is_deleted = 1");
  // 'all' = no filter
  if (q && q.trim().length > 0) {
    where.push("(email_normalized LIKE ? OR display_name LIKE ? OR phone_e164 LIKE ?)");
    const like = `%${q.trim().toLowerCase()}%`;
    binds.push(like, like, like);
  }
  binds.push(limit);
  const sql = `
    SELECT id, email, email_normalized, display_name, phone_e164,
           phone_verified_at, is_admin, is_archived, is_deleted,
           date_created, date_modified
    FROM users
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY date_created DESC
    LIMIT ?`;
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ items: rows.results });
});

// Admin can edit any field except the password hash (no bypassing user
// password verification). E.164 uses the shared regex; empty string clears
// the phone. displayName re-uses the same 2..60 constraint as signup.
const UserPatch = z.object({
  displayName: z.string().min(2).max(60).optional(),
  email: z.string().email().max(255).optional(),
  phoneE164: z
    .union([
      z.string().regex(/^\+[1-9]\d{7,14}$/),
      z.literal(""),
    ])
    .optional(),
  homeZip: z.union([z.string().regex(/^\d{5}$/), z.literal("")]).optional(),
  isArchived: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

adminRoutes.patch("/users/:id", async (c) => {
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = UserPatch.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const self = c.get("userId");
  if (id === self && parsed.data.isAdmin === false)
    return c.json({ error: "cannot_demote_self" }, 400);
  if (id === self && parsed.data.isDeleted === true)
    return c.json({ error: "cannot_delete_self" }, 400);

  const db = getDb(c.env.DB);
  const row = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row[0]) return c.json({ error: "not_found" }, 404);

  const now = Date.now();
  const upd: Record<string, unknown> = { dateModified: now };

  if (parsed.data.displayName !== undefined)
    upd.displayName = parsed.data.displayName.trim();
  if (parsed.data.email !== undefined) {
    const newNorm = parsed.data.email.trim().toLowerCase();
    if (newNorm !== row[0].emailNormalized) {
      // Uniqueness check against any other row
      const collision = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.emailNormalized, newNorm))
        .limit(1);
      if (collision[0] && collision[0].id !== id)
        return c.json({ error: "email_in_use" }, 409);
      upd.email = parsed.data.email.trim();
      upd.emailNormalized = newNorm;
      // Rebinding login identifier → kill other sessions.
      upd.sessionsInvalidatedAt = now;
    }
  }
  if (parsed.data.phoneE164 !== undefined) {
    upd.phoneE164 = parsed.data.phoneE164;
    // Admin edit clears any historical "verified" state.
    upd.phoneVerifiedAt = null;
  }
  if (parsed.data.homeZip !== undefined) {
    upd.homeZip = parsed.data.homeZip;
    if (parsed.data.homeZip) {
      const point = await geocodeUsZip(c.env, parsed.data.homeZip);
      upd.homeLat = point?.lat ?? null;
      upd.homeLng = point?.lng ?? null;
    } else {
      upd.homeLat = null;
      upd.homeLng = null;
    }
  }
  if (parsed.data.isArchived !== undefined) {
    upd.isArchived = parsed.data.isArchived ? 1 : 0;
    if (parsed.data.isArchived) upd.sessionsInvalidatedAt = now;
  }
  if (parsed.data.isDeleted !== undefined) {
    upd.isDeleted = parsed.data.isDeleted ? 1 : 0;
    if (parsed.data.isDeleted) upd.sessionsInvalidatedAt = now;
  }
  if (parsed.data.isAdmin !== undefined) {
    upd.isAdmin = parsed.data.isAdmin ? 1 : 0;
    // Admin toggle should force a re-login so the isAdmin bit in the
    // session cookie matches reality.
    upd.sessionsInvalidatedAt = now;
  }

  await db.update(users).set(upd as any).where(eq(users.id, id));
  return c.json({ ok: true });
});

// ---------- POST /admin/users/bulk ----------
const BulkAction = z.object({
  action: z.enum(["archive", "unarchive", "delete", "restore"]),
  userIds: z.array(z.string().min(1)).min(1).max(500),
});
adminRoutes.post("/users/bulk", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = BulkAction.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const self = c.get("userId");
  const targetIds = parsed.data.userIds.filter((id) => id !== self);
  if (targetIds.length === 0)
    return c.json({ error: "no_valid_targets" }, 400);

  const now = Date.now();
  const upd: Record<string, unknown> = { dateModified: now };
  const invalidate = ["archive", "delete"].includes(parsed.data.action);
  switch (parsed.data.action) {
    case "archive":
      upd.isArchived = 1;
      break;
    case "unarchive":
      upd.isArchived = 0;
      break;
    case "delete":
      upd.isDeleted = 1;
      break;
    case "restore":
      upd.isDeleted = 0;
      break;
  }
  if (invalidate) upd.sessionsInvalidatedAt = now;

  // D1 SQL — batched into one prepared statement per user id (D1 caps a
  // single statement's bindings; simple loop keeps it well within limits).
  const db = getDb(c.env.DB);
  for (const id of targetIds) {
    await db.update(users).set(upd as any).where(eq(users.id, id));
  }
  return c.json({ ok: true, affected: targetIds.length });
});

// ============================================================
// /admin/listings
// ============================================================
const ListingListQuery = z.object({
  q: z.string().optional(),
  status: z.enum(["active", "archived", "deleted", "withdrawn", "all"]).default("active"),
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

adminRoutes.get("/listings", async (c) => {
  const raw: Record<string, string> = {};
  new URL(c.req.url).searchParams.forEach((v, k) => (raw[k] = v));
  const parsed = ListingListQuery.safeParse(raw);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const { q, status, userId, limit } = parsed.data;

  const where: string[] = [];
  const binds: any[] = [];
  if (status === "active")
    where.push("l.is_deleted = 0 AND l.is_archived = 0 AND l.status = 'active'");
  else if (status === "archived") where.push("l.is_archived = 1 AND l.is_deleted = 0");
  else if (status === "deleted") where.push("l.is_deleted = 1");
  else if (status === "withdrawn") where.push("l.status = 'withdrawn'");
  if (userId) {
    where.push("l.user_id = ?");
    binds.push(userId);
  }
  if (q && q.trim().length > 0) {
    where.push("(lower(l.title) LIKE ? OR lower(l.description) LIKE ?)");
    const like = `%${q.trim().toLowerCase()}%`;
    binds.push(like, like);
  }
  binds.push(limit);
  const sql = `
    SELECT l.*, u.email AS owner_email, u.display_name AS owner_name,
           (SELECT lp.r2_key FROM listing_photos lp
             WHERE lp.listing_id = l.id ORDER BY lp.sort_order LIMIT 1) AS firstPhotoKey
    FROM listings l
    JOIN users u ON u.id = l.user_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY l.date_created DESC
    LIMIT ?`;
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ items: rows.results });
});

const ListingPatch = z.object({
  status: z.enum(["active", "traded", "withdrawn"]).optional(),
  isArchived: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
});

adminRoutes.patch("/listings/:id", async (c) => {
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = ListingPatch.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const db = getDb(c.env.DB);
  const row = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!row[0]) return c.json({ error: "not_found" }, 404);
  const upd: Record<string, unknown> = { dateModified: Date.now() };
  if (parsed.data.status !== undefined) upd.status = parsed.data.status;
  if (parsed.data.isArchived !== undefined)
    upd.isArchived = parsed.data.isArchived ? 1 : 0;
  if (parsed.data.isDeleted !== undefined)
    upd.isDeleted = parsed.data.isDeleted ? 1 : 0;
  await db.update(listings).set(upd as any).where(eq(listings.id, id));

  // Cascade: when a listing is soft-deleted, soft-delete its negotiations too
  // so they stop appearing in either party's inbox.
  if (parsed.data.isDeleted === true) {
    await db
      .update(negotiations)
      .set({ isDeleted: 1, dateModified: Date.now() })
      .where(eq(negotiations.listingId, id));
  }
  return c.json({ ok: true });
});

// ============================================================
// Drop all sessions for a given user (used after archive/delete)
// ============================================================
adminRoutes.post("/users/:id/sign-out", async (c) => {
  // We don't index sessions by user id, so this is a no-op stub: when KV is
  // hit by an already-signed-in user whose row is is_deleted/is_archived,
  // the auth middleware should re-check. For now we just respond OK; future
  // work: maintain a session→user index in KV.
  return c.json({ ok: true });
});
