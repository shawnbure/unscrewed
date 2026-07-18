// User reports + admin moderation queue.

import { Hono } from "hono";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  ReportCreateSchema,
  AdminReportResolveSchema,
  AUTO_HIDE_THRESHOLD,
} from "@unscrewed/shared";
import {
  getDb,
  reports,
  moderationActions,
  listings,
  blogPosts,
  users,
} from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { uuidv4 } from "../lib/crypto.js";

export const reportsRoutes = new Hono<AppContext>();

/** Append an audit-trail row. */
export async function logModAction(
  c: any,
  opts: {
    targetType: string;
    targetId: string;
    actorType: "admin" | "system";
    actorId: string | null;
    action: string;
    reason?: string;
    metadata?: unknown;
  }
) {
  const db = getDb(c.env.DB);
  await db.insert(moderationActions).values({
    id: uuidv4(),
    targetType: opts.targetType,
    targetId: opts.targetId,
    actorType: opts.actorType,
    actorId: opts.actorId,
    action: opts.action,
    reason: opts.reason ?? null,
    metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
  });
}

/**
 * Called after a new report is inserted. If distinct-reporter count >= N,
 * archive the target and mark all open reports as auto_hidden.
 */
async function maybeAutoHide(
  c: any,
  targetType: string,
  targetId: string
): Promise<{ triggered: boolean; distinctReporters: number }> {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({ reporterId: reports.reporterId })
    .from(reports)
    .where(
      and(eq(reports.targetType, targetType), eq(reports.targetId, targetId))
    );
  const distinct = new Set(rows.map((r) => r.reporterId)).size;
  if (distinct < AUTO_HIDE_THRESHOLD) return { triggered: false, distinctReporters: distinct };

  // Hide the target
  if (targetType === "listing") {
    await db
      .update(listings)
      .set({ isArchived: 1, dateModified: Date.now() })
      .where(eq(listings.id, targetId));
  } else if (targetType === "blog_post") {
    await db
      .update(blogPosts)
      .set({ status: "draft", dateModified: Date.now() })
      .where(eq(blogPosts.id, targetId));
  } else if (targetType === "user") {
    await db
      .update(users)
      .set({ isArchived: 1, dateModified: Date.now() })
      .where(eq(users.id, targetId));
  }

  // Flip all open reports for this target to auto_hidden
  await db
    .update(reports)
    .set({ status: "auto_hidden" })
    .where(
      and(
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
        eq(reports.status, "open")
      )
    );

  await logModAction(c, {
    targetType,
    targetId,
    actorType: "system",
    actorId: null,
    action: "auto_hide",
    reason: `${distinct} distinct reporters exceeded threshold ${AUTO_HIDE_THRESHOLD}`,
    metadata: { distinctReporters: distinct, threshold: AUTO_HIDE_THRESHOLD },
  });

  return { triggered: true, distinctReporters: distinct };
}

// ---------------- POST /reports ----------------
reportsRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = ReportCreateSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const input = parsed.data;
  if (input.targetType === "user" && input.targetId === userId)
    return c.json({ error: "cannot_report_self" }, 400);

  const db = getDb(c.env.DB);

  // Verify target exists (avoid junk reports against missing rows).
  if (input.targetType === "listing") {
    const [row] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, input.targetId))
      .limit(1);
    if (!row) return c.json({ error: "target_missing" }, 404);
  } else if (input.targetType === "blog_post") {
    const [row] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.id, input.targetId))
      .limit(1);
    if (!row) return c.json({ error: "target_missing" }, 404);
  } else if (input.targetType === "user") {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.targetId))
      .limit(1);
    if (!row) return c.json({ error: "target_missing" }, 404);
  }

  // Dedupe: one report per user per target.
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.targetType, input.targetType),
        eq(reports.targetId, input.targetId),
        eq(reports.reporterId, userId)
      )
    )
    .limit(1);
  if (existing) return c.json({ ok: true, alreadyReported: true });

  await db.insert(reports).values({
    id: uuidv4(),
    targetType: input.targetType,
    targetId: input.targetId,
    reporterId: userId,
    reason: input.reason,
    notes: input.notes?.trim() || null,
  });

  const auto = await maybeAutoHide(c, input.targetType, input.targetId);
  return c.json({ ok: true, autoHidden: auto.triggered });
});

// ---------------- GET /admin/reports ----------------
reportsRoutes.get("/admin", requireAdmin, async (c) => {
  const url = new URL(c.req.url);
  const status = url.searchParams.get("status") ?? "open_and_auto";
  const db = getDb(c.env.DB);

  const wheres: any[] = [];
  if (status === "open") wheres.push(eq(reports.status, "open"));
  else if (status === "auto_hidden") wheres.push(eq(reports.status, "auto_hidden"));
  else if (status === "open_and_auto") wheres.push(ne(reports.status, "resolved_action"));
  // "all" = no filter

  const rows = await c.env.DB.prepare(
    `SELECT
       r.id, r.target_type, r.target_id, r.reason, r.notes, r.status,
       r.date_created, r.date_resolved, r.resolution_note,
       u.display_name AS reporter_name,
       (SELECT COUNT(DISTINCT reporter_id) FROM reports r2
          WHERE r2.target_type = r.target_type AND r2.target_id = r.target_id)
         AS distinct_reporters,
       (CASE r.target_type
          WHEN 'listing'   THEN (SELECT title FROM listings WHERE id = r.target_id)
          WHEN 'blog_post' THEN (SELECT title FROM blog_posts WHERE id = r.target_id)
          WHEN 'user'      THEN (SELECT display_name FROM users WHERE id = r.target_id)
        END) AS target_label
     FROM reports r
     JOIN users u ON u.id = r.reporter_id
     ${status === "open" ? "WHERE r.status = 'open'" : ""}
     ${status === "auto_hidden" ? "WHERE r.status = 'auto_hidden'" : ""}
     ${status === "open_and_auto" ? "WHERE r.status != 'resolved_action' AND r.status != 'resolved_no_action'" : ""}
     ORDER BY r.date_created DESC
     LIMIT 200`
  ).all();
  void wheres;
  return c.json({ items: rows.results });
});

// ---------------- PATCH /admin/reports/:id ----------------
reportsRoutes.patch("/admin/:id", requireAdmin, async (c) => {
  const actorId = c.get("userId")!;
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = AdminReportResolveSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const db = getDb(c.env.DB);
  const [row] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!row) return c.json({ error: "not_found" }, 404);

  const now = Date.now();
  const { status, action, resolutionNote } = parsed.data;

  // Apply the admin action to the target
  if (status === "resolved_action" && action) {
    if (row.targetType === "listing") {
      if (action === "delete") {
        await db.update(listings).set({ isDeleted: 1, dateModified: now }).where(eq(listings.id, row.targetId));
      } else if (action === "hide") {
        await db.update(listings).set({ isArchived: 1, dateModified: now }).where(eq(listings.id, row.targetId));
      }
    } else if (row.targetType === "blog_post") {
      if (action === "delete") {
        await db.update(blogPosts).set({ isDeleted: 1, dateModified: now }).where(eq(blogPosts.id, row.targetId));
      } else if (action === "hide") {
        await db.update(blogPosts).set({ status: "draft", dateModified: now }).where(eq(blogPosts.id, row.targetId));
      }
    } else if (row.targetType === "user") {
      if (action === "delete") {
        await db.update(users).set({ isDeleted: 1, sessionsInvalidatedAt: now, dateModified: now }).where(eq(users.id, row.targetId));
      } else if (action === "hide") {
        await db.update(users).set({ isArchived: 1, sessionsInvalidatedAt: now, dateModified: now }).where(eq(users.id, row.targetId));
      }
    }
    if (action === "approve") {
      // "approve" means the content is fine — un-hide if it was auto-hidden.
      if (row.targetType === "listing") {
        await db.update(listings).set({ isArchived: 0, dateModified: now }).where(eq(listings.id, row.targetId));
      } else if (row.targetType === "blog_post") {
        await db.update(blogPosts).set({ status: "published", dateModified: now }).where(eq(blogPosts.id, row.targetId));
      } else if (row.targetType === "user") {
        await db.update(users).set({ isArchived: 0, dateModified: now }).where(eq(users.id, row.targetId));
      }
    }
    await logModAction(c, {
      targetType: row.targetType,
      targetId: row.targetId,
      actorType: "admin",
      actorId,
      action,
      reason: resolutionNote,
      metadata: { reportId: id },
    });
  }

  // Update all open+auto_hidden reports for this same target together — one
  // decision covers the batch.
  await db
    .update(reports)
    .set({
      status,
      resolvedBy: actorId,
      resolutionNote: resolutionNote ?? null,
      dateResolved: now,
    })
    .where(
      and(
        eq(reports.targetType, row.targetType),
        eq(reports.targetId, row.targetId),
        ne(reports.status, "resolved_action"),
        ne(reports.status, "resolved_no_action")
      )
    );

  return c.json({ ok: true });
});
