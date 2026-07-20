import { Hono } from "hono";
import { AttributionSchema } from "@unscrewed/shared";
import { getDb, growthVisits } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { uuidv4 } from "../lib/crypto.js";
import { rateLimit } from "../lib/rateLimit.js";

export const growthRoutes = new Hono<AppContext>();

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
