// "Thoughts on making money :)" — the community workspace for how
// unscrewed could sustain itself. List is public (unauth callers can
// read + see totals). Voting and submitting require an account.

import { Hono } from "hono";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb, moneyIdeas, moneyIdeaVotes, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { uuidv4 } from "../lib/crypto.js";

export const moneyIdeasRoutes = new Hono<AppContext>();

// ---------- list ----------
moneyIdeasRoutes.get("/", optionalAuth, async (c) => {
  const userId = c.get("userId");
  // Optional filter: ?kind=trust_stack | community_suggestion
  const kind = new URL(c.req.url).searchParams.get("kind") ?? "";
  const params: any[] = [];
  const wheres = ["m.is_deleted = 0"];
  if (kind) {
    wheres.push("m.kind = ?");
    params.push(kind);
  }
  const sql = `
    SELECT m.id, m.kind, m.title, m.description, m.price_hint, m.status,
           m.submitted_by, m.votes_up, m.votes_down, m.date_created,
           u.display_name AS submitter_name,
           ${userId ? "(SELECT vote FROM money_idea_votes v WHERE v.idea_id = m.id AND v.user_id = ?) AS my_vote" : "NULL AS my_vote"}
      FROM money_ideas m
      LEFT JOIN users u ON u.id = m.submitted_by
     WHERE ${wheres.join(" AND ")}
     ORDER BY (m.votes_up - m.votes_down) DESC, m.date_created ASC`;
  const binds = userId ? [userId, ...params] : params;
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ items: rows.results });
});

// ---------- create (community suggestion) ----------
const CreateSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().min(10).max(4000),
  priceHint: z.string().max(60).optional(),
});
moneyIdeasRoutes.post("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const db = getDb(c.env.DB);
  const id = uuidv4();
  await db.insert(moneyIdeas).values({
    id,
    kind: "community_suggestion",
    title: parsed.data.title.trim(),
    description: parsed.data.description.trim(),
    priceHint: parsed.data.priceHint?.trim() || null,
    status: "proposed",
    submittedBy: userId,
  });
  return c.json({ id });
});

// ---------- vote ----------
// body: { vote: 1 | -1 | 0 }  (0 = clear my vote)
const VoteSchema = z.object({ vote: z.union([z.literal(1), z.literal(-1), z.literal(0)]) });
moneyIdeasRoutes.post("/:id/vote", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = VoteSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const nextVote = parsed.data.vote;

  const db = getDb(c.env.DB);
  const [idea] = await db
    .select()
    .from(moneyIdeas)
    .where(eq(moneyIdeas.id, id))
    .limit(1);
  if (!idea || idea.isDeleted === 1)
    return c.json({ error: "not_found" }, 404);

  const [prev] = await db
    .select()
    .from(moneyIdeaVotes)
    .where(and(eq(moneyIdeaVotes.ideaId, id), eq(moneyIdeaVotes.userId, userId)))
    .limit(1);
  const prevVote = prev?.vote ?? 0;

  // Update the vote row (or delete if clearing).
  const now = Date.now();
  if (nextVote === 0) {
    if (prev) {
      await db.delete(moneyIdeaVotes).where(eq(moneyIdeaVotes.id, prev.id));
    }
  } else if (prev) {
    await db
      .update(moneyIdeaVotes)
      .set({ vote: nextVote, dateModified: now })
      .where(eq(moneyIdeaVotes.id, prev.id));
  } else {
    await db.insert(moneyIdeaVotes).values({
      id: uuidv4(),
      ideaId: id,
      userId,
      vote: nextVote,
    });
  }

  // Recompute cached totals from the source of truth.
  const totals = await c.env.DB.prepare(
    `SELECT
        SUM(CASE WHEN vote =  1 THEN 1 ELSE 0 END) AS up,
        SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS down
      FROM money_idea_votes WHERE idea_id = ?1`
  )
    .bind(id)
    .first<{ up: number | null; down: number | null }>();
  await db
    .update(moneyIdeas)
    .set({
      votesUp: totals?.up ?? 0,
      votesDown: totals?.down ?? 0,
      dateModified: now,
    })
    .where(eq(moneyIdeas.id, id));

  return c.json({
    ok: true,
    votesUp: totals?.up ?? 0,
    votesDown: totals?.down ?? 0,
    myVote: nextVote,
    prevVote,
  });
});

// ---------- admin: update status / soft-delete ----------
const AdminPatchSchema = z.object({
  status: z.enum(["proposed", "accepted", "shipped", "rejected"]).optional(),
  isDeleted: z.boolean().optional(),
});
moneyIdeasRoutes.patch("/:id", requireAuth, async (c) => {
  const isAdmin = c.get("isAdmin");
  if (!isAdmin) return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = AdminPatchSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const upd: Record<string, unknown> = { dateModified: Date.now() };
  if (parsed.data.status !== undefined) upd.status = parsed.data.status;
  if (parsed.data.isDeleted !== undefined)
    upd.isDeleted = parsed.data.isDeleted ? 1 : 0;
  const db = getDb(c.env.DB);
  await db.update(moneyIdeas).set(upd as any).where(eq(moneyIdeas.id, id));
  return c.json({ ok: true });
});

// Suppress the unused users import warning if we ever tree-shake.
void users;
