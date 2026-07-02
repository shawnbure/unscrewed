import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { getDb, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { readSession, destroySession } from "../lib/session.js";

/**
 * Verify the session's underlying user is still valid on every
 * authenticated request. Cheap: one indexed SELECT per hit.
 *
 * Return values:
 *   ok        — session is good
 *   gone      — user was soft-deleted; drop the cookie
 *   suspended — user is archived; drop the cookie
 *   stale     — user's sessions_invalidated_at is newer than session.createdAt
 *               (password / email changed elsewhere) — drop the cookie
 */
async function ensureUserStillValid(
  c: any,
  session: { userId: string; createdAt: number }
): Promise<"ok" | "gone" | "suspended" | "stale"> {
  const db = getDb(c.env.DB);
  const u = await db
    .select({
      isDeleted: users.isDeleted,
      isArchived: users.isArchived,
      sessionsInvalidatedAt: users.sessionsInvalidatedAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!u[0] || u[0].isDeleted === 1) return "gone";
  if (u[0].isArchived === 1) return "suspended";
  if (
    u[0].sessionsInvalidatedAt &&
    u[0].sessionsInvalidatedAt > session.createdAt
  )
    return "stale";
  return "ok";
}

export const requireAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const s = await readSession(c);
  if (!s) return c.json({ error: "unauthorized" }, 401);
  const valid = await ensureUserStillValid(c, s);
  if (valid !== "ok") {
    await destroySession(c);
    const errorMap = {
      gone: "account_gone",
      suspended: "account_suspended",
      stale: "session_invalidated",
    } as const;
    return c.json({ error: errorMap[valid] }, 403);
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
