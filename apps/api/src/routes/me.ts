import { Hono } from "hono";
import { eq, and, ne } from "drizzle-orm";
import {
  UpdatePhoneSchema,
  UpdateZipSchema,
  UpdateNameSchema,
  UpdateEmailSchema,
  ChangePasswordSchema,
  DeleteAccountSchema,
} from "@unscrewed/shared";
import { getDb, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { geocodeUsZip } from "../lib/geocode.js";
import { hashPassword, verifyPassword } from "../lib/crypto.js";
import { createSession, destroySession } from "../lib/session.js";

export const meRoutes = new Hono<AppContext>();

meRoutes.use("*", requireAuth);

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

// ---------- GET /me ----------
meRoutes.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const userId = c.get("userId")!;
  const row = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      phoneE164: users.phoneE164,
      phoneVerifiedAt: users.phoneVerifiedAt,
      homeZip: users.homeZip,
      isAdmin: users.isAdmin,
      dateCreated: users.dateCreated,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row[0]) return c.json({ error: "not_found" }, 404);
  return c.json(row[0]);
});

// ---------- PATCH /me/name ----------
meRoutes.patch("/name", async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = UpdateNameSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const db = getDb(c.env.DB);
  await db
    .update(users)
    .set({
      displayName: parsed.data.displayName.trim(),
      dateModified: Date.now(),
    })
    .where(eq(users.id, userId));
  return c.json({ ok: true, displayName: parsed.data.displayName.trim() });
});

// ---------- PATCH /me/phone ----------
meRoutes.patch("/phone", async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = UpdatePhoneSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const db = getDb(c.env.DB);
  await db
    .update(users)
    .set({
      phoneE164: parsed.data.phone,
      phoneVerifiedAt: null,
      dateModified: Date.now(),
    })
    .where(eq(users.id, userId));
  return c.json({ ok: true, phoneE164: parsed.data.phone });
});

// ---------- PATCH /me/zip ----------
meRoutes.patch("/zip", async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = UpdateZipSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const point = await geocodeUsZip(c.env, parsed.data.homeZip);
  const db = getDb(c.env.DB);
  await db
    .update(users)
    .set({
      homeZip: parsed.data.homeZip,
      homeLat: point?.lat ?? null,
      homeLng: point?.lng ?? null,
      dateModified: Date.now(),
    })
    .where(eq(users.id, userId));
  return c.json({ ok: true, homeZip: parsed.data.homeZip });
});

// ---------- PATCH /me/email ----------
// Requires current password. Rebinding the account's login identifier is
// as sensitive as changing the password, so re-authenticate first.
meRoutes.patch("/email", async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = UpdateEmailSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const db = getDb(c.env.DB);
  const [me] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!me) return c.json({ error: "not_found" }, 404);

  const pwOk = await verifyPassword(parsed.data.currentPassword, me.passwordHash);
  if (!pwOk) return c.json({ error: "invalid_password" }, 401);

  const newNorm = normalizeEmail(parsed.data.email);
  if (newNorm !== me.emailNormalized) {
    const [collision] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.emailNormalized, newNorm), ne(users.id, userId))
      )
      .limit(1);
    if (collision) return c.json({ error: "email_in_use" }, 409);
  }

  const now = Date.now();
  await db
    .update(users)
    .set({
      email: parsed.data.email.trim(),
      emailNormalized: newNorm,
      dateModified: now,
      // Rebinding the login identifier invalidates every other session too.
      sessionsInvalidatedAt: now - 1,
    })
    .where(eq(users.id, userId));

  // Re-mint the caller's cookie so THEIR session survives the invalidation.
  await destroySession(c);
  await createSession(c, userId, me.isAdmin === 1);
  return c.json({ ok: true, email: parsed.data.email.trim() });
});

// ---------- PATCH /me/password ----------
meRoutes.patch("/password", async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const db = getDb(c.env.DB);
  const [me] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!me) return c.json({ error: "not_found" }, 404);

  const pwOk = await verifyPassword(parsed.data.currentPassword, me.passwordHash);
  if (!pwOk) return c.json({ error: "invalid_password" }, 401);
  if (parsed.data.currentPassword === parsed.data.newPassword)
    return c.json({ error: "same_password" }, 400);

  const newHash = await hashPassword(parsed.data.newPassword);
  const now = Date.now();
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      // Anything before (now - 1) is toast.
      sessionsInvalidatedAt: now - 1,
      dateModified: now,
    })
    .where(eq(users.id, userId));

  // Refresh our own cookie so we stay signed in.
  await destroySession(c);
  await createSession(c, userId, me.isAdmin === 1);
  return c.json({ ok: true });
});

// ---------- DELETE /me ----------
// Soft-delete via is_deleted so admins can still find the row. Requires the
// current password to prevent CSRF / stolen-session account destruction.
meRoutes.delete("/", async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = DeleteAccountSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const db = getDb(c.env.DB);
  const [me] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!me) return c.json({ error: "not_found" }, 404);

  const pwOk = await verifyPassword(parsed.data.currentPassword, me.passwordHash);
  if (!pwOk) return c.json({ error: "invalid_password" }, 401);

  const now = Date.now();
  await db
    .update(users)
    .set({
      isDeleted: 1,
      sessionsInvalidatedAt: now,
      dateModified: now,
    })
    .where(eq(users.id, userId));
  await destroySession(c);
  return c.json({ ok: true });
});
