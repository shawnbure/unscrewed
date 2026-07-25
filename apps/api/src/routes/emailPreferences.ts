import { Hono, type Context } from "hono";
import { eq } from "drizzle-orm";
import { UpdateTradeEmailNotificationsSchema } from "@unscrewed/shared";
import { getDb, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import {
  timingSafeEqualHex,
} from "../lib/crypto.js";
import { tradeEmailPreferenceToken } from "../lib/tradeEmail.js";

export const emailPreferencesRoutes = new Hono<AppContext>();

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${local.length > visible.length ? "•••" : ""}@${domain}`;
}

async function authorize(c: Context<AppContext>) {
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
      enabled: users.tradeEmailNotifications,
      isDeleted: users.isDeleted,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.isDeleted === 1) return null;
  const expectedToken = await tradeEmailPreferenceToken(
    c.env,
    user.id,
    user.emailNormalized
  );
  return timingSafeEqualHex(suppliedToken, expectedToken) ? user : null;
}

emailPreferencesRoutes.get("/", async (c) => {
  const user = await authorize(c);
  if (!user) return c.json({ error: "invalid_link" }, 403);
  return c.json({
    email: maskEmail(user.email),
    enabled: user.enabled === 1,
  });
});

emailPreferencesRoutes.post("/", async (c) => {
  const user = await authorize(c);
  if (!user) return c.json({ error: "invalid_link" }, 403);
  const json = await c.req.json().catch(() => null);
  const parsed = UpdateTradeEmailNotificationsSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const db = getDb(c.env.DB);
  const result = await db
    .update(users)
    .set({
      tradeEmailNotifications: parsed.data.enabled ? 1 : 0,
      dateModified: Date.now(),
    })
    .where(eq(users.id, user.id))
    .returning({ id: users.id });
  if (!result[0]) return c.json({ error: "invalid_link" }, 404);
  return c.json({ ok: true, enabled: parsed.data.enabled });
});
