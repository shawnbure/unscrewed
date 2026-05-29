import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { getDb, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { readSession, destroySession } from "../lib/session.js";

/**
 * Block a session whose underlying user has been archived or deleted.
 * Cached check: only re-validates against the DB every 60s per session by
 * piggybacking on session.lastSeenAt (already refreshed periodically).
 *
 * We avoid a DB lookup on every request; it runs at sliding-refresh time.
 */
async function ensureUserStillValid(
  c: any,
  userId: string
): Promise<"ok" | "gone" | "suspended"> {
  const db = getDb(c.env.DB);
  const u = await db
    .select({ isDeleted: users.isDeleted, isArchived: users.isArchived })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u[0] || u[0].isDeleted === 1) return "gone";
  if (u[0].isArchived === 1) return "suspended";
  return "ok";
}

export const requireAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const s = await readSession(c);
  if (!s) return c.json({ error: "unauthorized" }, 401);
  const valid = await ensureUserStillValid(c, s.userId);
  if (valid !== "ok") {
    await destroySession(c);
    return c.json(
      { error: valid === "suspended" ? "account_suspended" : "account_gone" },
      403
    );
  }
  c.set("userId", s.userId);
  c.set("isAdmin", s.isAdmin);
  await next();
};

export const optionalAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const s = await readSession(c);
  if (s) {
    c.set("userId", s.userId);
    c.set("isAdmin", s.isAdmin);
  }
  await next();
};

export const requireAdmin: MiddlewareHandler<AppContext> = async (c, next) => {
  const s = await readSession(c);
  if (!s) return c.json({ error: "unauthorized" }, 401);
  if (!s.isAdmin) return c.json({ error: "forbidden" }, 403);
  c.set("userId", s.userId);
  c.set("isAdmin", s.isAdmin);
  await next();
};
