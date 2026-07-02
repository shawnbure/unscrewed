import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { UpdatePhoneSchema, UpdateZipSchema } from "@unscrewed/shared";
import { getDb, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { geocodeUsZip } from "../lib/geocode.js";

export const meRoutes = new Hono<AppContext>();

meRoutes.use("*", requireAuth);

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

// Update the caller's phone. Contact metadata only — never texted.
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

// Update the caller's home ZIP. Re-geocodes so the /community map stays
// accurate. Never exposes the stored (lat, lng) directly.
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
