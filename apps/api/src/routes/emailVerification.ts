import { Hono, type Context } from "hono";
import { eq } from "drizzle-orm";
import { getDb, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { timingSafeEqualHex } from "../lib/crypto.js";
import {
  emailVerificationToken,
  sendVerificationEmail,
} from "../lib/verificationEmail.js";

export const emailVerificationRoutes = new Hono<AppContext>();

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${local.length > visible.length ? "•••" : ""}@${domain}`;
}

async function authorizedUser(c: Context<AppContext>) {
  const userId = c.req.query("u") ?? "";
  const suppliedToken = c.req.query("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f]{64}$/i.test(suppliedToken))
    return null;

  const db = getDb(c.env.DB);
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailNormalized: users.emailNormalized,
      emailVerifiedAt: users.emailVerifiedAt,
      isDeleted: users.isDeleted,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.isDeleted === 1) return null;
  const expectedToken = await emailVerificationToken(
    c.env,
    user.id,
    user.emailNormalized
  );
  return timingSafeEqualHex(suppliedToken, expectedToken) ? user : null;
}

emailVerificationRoutes.get("/", async (c) => {
  const user = await authorizedUser(c);
  if (!user) return c.json({ error: "invalid_link" }, 403);
  return c.json({
    email: maskEmail(user.email),
    verified: user.emailVerifiedAt !== null,
  });
});

// Deliberately POST rather than mutating on GET: link-preview bots and mail
// scanners should not verify an account merely by checking the URL.
emailVerificationRoutes.post("/", async (c) => {
  const user = await authorizedUser(c);
  if (!user) return c.json({ error: "invalid_link" }, 403);
  if (user.emailVerifiedAt === null) {
    const db = getDb(c.env.DB);
    await db
      .update(users)
      .set({ emailVerifiedAt: Date.now(), dateModified: Date.now() })
      .where(eq(users.id, user.id));
  }
  return c.json({ ok: true, verified: true });
});

emailVerificationRoutes.post("/resend", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const db = getDb(c.env.DB);
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailNormalized: users.emailNormalized,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return c.json({ error: "not_found" }, 404);
  if (user.emailVerifiedAt !== null)
    return c.json({ ok: true, verified: true });
  const result = await sendVerificationEmail(c.env, {
    userId: user.id,
    email: user.email,
    emailNormalized: user.emailNormalized,
  });
  return c.json({
    ok: true,
    verified: false,
    sent: result === "sent",
  });
});
