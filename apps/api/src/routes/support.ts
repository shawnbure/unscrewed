import { Hono } from "hono";
import { desc, eq, or } from "drizzle-orm";
import {
  AdminSupportRequestUpdateSchema,
  SupportRequestCreateSchema,
} from "@unscrewed/shared";
import { getDb, supportRequests } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAdmin } from "../middleware/auth.js";
import { sha256Hex, uuidv4 } from "../lib/crypto.js";
import {
  notifyOrganizerLead,
  notifyPressLead,
} from "../lib/organizerLeadEmail.js";
import { rateLimit } from "../lib/rateLimit.js";
import { verifyTurnstile } from "../lib/turnstile.js";

export const supportRoutes = new Hono<AppContext>();

supportRoutes.post("/", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = SupportRequestCreateSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const input = parsed.data;

  // Silently accept honeypot submissions so simple bots get no tuning signal.
  if (input.website) return c.json({ ok: true });

  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const turnstileOk = await verifyTurnstile(
    c.env,
    input.turnstileToken,
    ip
  );
  if (!turnstileOk) return c.json({ error: "turnstile_failed" }, 400);

  const limitKey = await sha256Hex(ip ?? input.email.toLowerCase());
  const limited = await rateLimit(c.env, `support:${limitKey}`, 3, 60 * 60);
  if (!limited.allowed) return c.json({ error: "rate_limited" }, 429);

  const id = uuidv4();
  await getDb(c.env.DB).insert(supportRequests).values({
    id,
    name: input.name,
    email: input.email.toLowerCase(),
    topic: input.topic,
    message: input.message,
    attributionSource: input.attribution?.source,
    attributionMedium: input.attribution?.medium,
    attributionCampaign: input.attribution?.campaign,
  });

  if (input.topic === "organizer") {
    c.executionCtx.waitUntil(
      notifyOrganizerLead(c.env, {
        requestId: id,
        name: input.name,
        email: input.email,
        message: input.message,
        attribution: input.attribution,
      }).catch((error) => {
        console.error("[support] organizer alert failed", error);
      })
    );
  }
  if (input.topic === "press") {
    c.executionCtx.waitUntil(
      notifyPressLead(c.env, {
        requestId: id,
        name: input.name,
        email: input.email,
        message: input.message,
        attribution: input.attribution,
      }).catch((error) => {
        console.error("[support] press alert failed", error);
      })
    );
  }

  // Retain active requests, but do not keep resolved/spam contact details
  // indefinitely. Cleanup is best-effort and runs with normal submissions.
  try {
    await c.env.DB.prepare(
      `DELETE FROM support_requests
        WHERE status IN ('resolved', 'spam')
          AND date_modified < ?1`
    )
      .bind(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .run();
  } catch (error) {
    // The request is already safely stored; retention cleanup must not turn
    // a successful submission into an apparent failure and duplicate retry.
    console.warn("[support] retention cleanup failed", error);
  }

  return c.json({ ok: true, requestId: id }, 201);
});

supportRoutes.get("/admin", requireAdmin, async (c) => {
  const status = new URL(c.req.url).searchParams.get("status") ?? "active";
  const db = getDb(c.env.DB);

  const items =
    status === "all"
      ? await db
          .select()
          .from(supportRequests)
          .orderBy(desc(supportRequests.dateCreated))
          .limit(200)
      : status === "active"
        ? await db
            .select()
            .from(supportRequests)
            .where(
              or(
                eq(supportRequests.status, "open"),
                eq(supportRequests.status, "in_progress")
              )
            )
            .orderBy(desc(supportRequests.dateCreated))
            .limit(200)
        : await db
            .select()
            .from(supportRequests)
            .where(eq(supportRequests.status, status))
            .orderBy(desc(supportRequests.dateCreated))
            .limit(200);

  return c.json({ items });
});

supportRoutes.patch("/admin/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const actorId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = AdminSupportRequestUpdateSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const db = getDb(c.env.DB);
  const [existing] = await db
    .select({ id: supportRequests.id })
    .from(supportRequests)
    .where(eq(supportRequests.id, id))
    .limit(1);
  if (!existing) return c.json({ error: "not_found" }, 404);

  const now = Date.now();
  const resolved =
    parsed.data.status === "resolved" || parsed.data.status === "spam";
  await db
    .update(supportRequests)
    .set({
      status: parsed.data.status,
      adminNote: parsed.data.adminNote?.trim() || null,
      resolvedBy: resolved ? actorId : null,
      dateResolved: resolved ? now : null,
      dateModified: now,
    })
    .where(eq(supportRequests.id, id));

  return c.json({ ok: true });
});
