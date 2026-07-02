import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { UpdatePhoneSchema } from "@unscrewed/shared";
import { getDb, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth } from "../middleware/auth.js";

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
      isAdmin: users.isAdmin,
      dateCreated: users.dateCreated,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row[0]) return c.json({ error: "not_found" }, 404);
  return c.json(row[0]);
});

// Update the caller's phone. Phone is a contact metadata field only —
// it is not verified and no SMS is sent. Blank string clears the field.
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
      // Legacy verified timestamp is meaningless now that we don't verify;
      // clear it whenever the phone is updated so admin views can't imply
      // trust that doesn't exist.
      phoneVerifiedAt: null,
      dateModified: Date.now(),
    })
    .where(eq(users.id, userId));
  return c.json({ ok: true, phoneE164: parsed.data.phone });
});
