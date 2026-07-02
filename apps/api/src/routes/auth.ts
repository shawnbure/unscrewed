// Auth routes: email + password + Turnstile only. Optional phone at
// signup is stored as a profile field but never verified. Passkeys are
// wired separately via /passkeys — see routes/passkeys.ts.
//
// Any lingering SMS 2FA infrastructure (Telnyx, verify endpoints, etc.)
// has been removed intentionally — see the ToS "Our philosophy" section
// on zero-footprint / ephemeral communication.

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { SignupSchema, LoginSchema } from "@unscrewed/shared";
import { getDb, users, tosAcceptances } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { hashPassword, verifyPassword, uuidv4 } from "../lib/crypto.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { rateLimit } from "../lib/rateLimit.js";
import { createSession, destroySession, readSession } from "../lib/session.js";

export const authRoutes = new Hono<AppContext>();

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

function clientIp(c: any): string | undefined {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
  );
}

// ---------------- signup ----------------
authRoutes.post("/signup", async (c) => {
  const ip = clientIp(c);
  const rl = await rateLimit(c.env, `signup:${ip ?? "unknown"}`, 10, 3600);
  if (!rl.allowed) return c.json({ error: "rate_limited" }, 429);

  const json = await c.req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const input = parsed.data;

  if (input.tosVersion !== c.env.TOS_VERSION)
    return c.json(
      { error: "stale_tos", currentVersion: c.env.TOS_VERSION },
      400
    );

  const ok = await verifyTurnstile(c.env, input.turnstileToken, ip);
  if (!ok) return c.json({ error: "turnstile_failed" }, 400);

  const db = getDb(c.env.DB);
  const emailNorm = normalizeEmail(input.email);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, emailNorm))
    .limit(1);
  if (existing.length > 0) return c.json({ error: "email_in_use" }, 409);

  const userId = uuidv4();
  const passwordHash = await hashPassword(input.password);
  const now = Date.now();
  const phone = ((input.phone ?? "") as string).trim();
  await db.insert(users).values({
    id: userId,
    email: input.email.trim(),
    emailNormalized: emailNorm,
    passwordHash,
    phoneE164: phone,
    displayName: input.displayName.trim(),
    dateCreated: now,
    dateModified: now,
  });
  await db.insert(tosAcceptances).values({
    id: uuidv4(),
    userId,
    tosVersion: input.tosVersion,
    ipAddress: ip,
    userAgent: c.req.header("user-agent")?.slice(0, 500),
  });

  await createSession(c, userId, false);
  return c.json({ ok: true, step: "done" });
});

// ---------------- login ----------------
authRoutes.post("/login", async (c) => {
  const ip = clientIp(c);
  const rl = await rateLimit(c.env, `login:${ip ?? "unknown"}`, 20, 600);
  if (!rl.allowed) return c.json({ error: "rate_limited" }, 429);

  const json = await c.req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const input = parsed.data;

  const ok = await verifyTurnstile(c.env, input.turnstileToken, ip);
  if (!ok) return c.json({ error: "turnstile_failed" }, 400);

  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, normalizeEmail(input.email)))
    .limit(1);
  const u = row[0];
  if (!u || u.isDeleted) return c.json({ error: "invalid_credentials" }, 401);
  if (u.isArchived) return c.json({ error: "account_suspended" }, 403);

  const pwOk = await verifyPassword(input.password, u.passwordHash);
  if (!pwOk) return c.json({ error: "invalid_credentials" }, 401);

  await createSession(c, u.id, u.isAdmin === 1);
  return c.json({ ok: true, step: "done" });
});

// ---------------- logout ----------------
authRoutes.post("/logout", async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

// ---------------- session ----------------
authRoutes.get("/session", async (c) => {
  const s = await readSession(c);
  if (!s) return c.json({ authenticated: false });
  return c.json({ authenticated: true, userId: s.userId, isAdmin: s.isAdmin });
});
