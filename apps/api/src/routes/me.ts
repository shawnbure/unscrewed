import { Hono } from "hono";
import { eq } from "drizzle-orm";
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
