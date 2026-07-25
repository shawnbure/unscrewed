import { Hono } from "hono";
import { and, eq, or } from "drizzle-orm";
import {
  NegotiationStartSchema,
  NegotiationMessageSchema,
} from "@unscrewed/shared";
import {
  getDb,
  listings,
  negotiations,
  negotiationMessages,
  contracts,
} from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { uuidv4 } from "../lib/crypto.js";
import { notifyTradeParticipant } from "../lib/tradeEmail.js";
import { generateDraft, createContract } from "./contracts.js";

export const negotiationRoutes = new Hono<AppContext>();

negotiationRoutes.use("*", requireAuth);

// list my negotiations
// Returns rows joined with: listing.title + status, other-party display_name,
// last message body/at, message count, current contract status (if any).
negotiationRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;
  const url = new URL(c.req.url);
  const status = (url.searchParams.get("status") ?? "active") as
    | "active"
    | "archived"
    | "all";

  let archiveFilter = "n.is_archived = 0";
  if (status === "archived") archiveFilter = "n.is_archived = 1";
  else if (status === "all") archiveFilter = "1=1";

  const rows = await c.env.DB.prepare(
    `SELECT
       n.id, n.listing_id, n.lister_user_id, n.requester_user_id,
       n.offering, n.status, n.is_archived, n.is_deleted,
       n.date_created, n.date_modified,
       l.title         AS listing_title,
       l.status        AS listing_status,
       l.kind          AS listing_kind,
       l.category      AS listing_category,
       l.is_deleted    AS listing_is_deleted,
       (CASE WHEN ?1 = n.lister_user_id THEN u_req.display_name ELSE u_list.display_name END) AS other_name,
       (SELECT lp.r2_key FROM listing_photos lp
         WHERE lp.listing_id = l.id ORDER BY lp.sort_order LIMIT 1)        AS firstPhotoKey,
       (SELECT COUNT(*) FROM negotiation_messages nm
         WHERE nm.negotiation_id = n.id)                                   AS message_count,
       (SELECT nm.body FROM negotiation_messages nm
         WHERE nm.negotiation_id = n.id ORDER BY nm.date_created DESC LIMIT 1)
                                                                          AS last_message_body,
       (SELECT nm.date_created FROM negotiation_messages nm
         WHERE nm.negotiation_id = n.id ORDER BY nm.date_created DESC LIMIT 1)
                                                                          AS last_message_at,
       (SELECT COUNT(*) FROM negotiation_messages nm
         WHERE nm.negotiation_id = n.id
           AND nm.sender_user_id != ?1
           AND nm.date_created >
             COALESCE(
               CASE
                 WHEN ?1 = n.lister_user_id THEN n.lister_last_read_at
                 ELSE n.requester_last_read_at
               END,
               0
             ))                                                           AS unread_count,
       (SELECT c.status FROM contracts c
         WHERE c.negotiation_id = n.id AND c.status != 'cancelled'
         ORDER BY c.date_created DESC LIMIT 1)                            AS active_contract_status,
       (SELECT c.id FROM contracts c
         WHERE c.negotiation_id = n.id AND c.status != 'cancelled'
         ORDER BY c.date_created DESC LIMIT 1)                            AS active_contract_id
     FROM negotiations n
     JOIN listings l   ON l.id = n.listing_id
     JOIN users u_list ON u_list.id = n.lister_user_id
     JOIN users u_req  ON u_req.id  = n.requester_user_id
     WHERE n.is_deleted = 0
       AND ${archiveFilter}
       AND (n.lister_user_id = ?1 OR n.requester_user_id = ?1)
     ORDER BY COALESCE(last_message_at, n.date_modified) DESC`
  )
    .bind(userId)
    .all();
  return c.json({ items: rows.results });
});

// Persistent unread totals for navigation badges. WebSocket fanout is only
// realtime convenience; these D1 cursors remain authoritative across devices
// and disconnected sessions.
negotiationRoutes.get("/unread-count", async (c) => {
  const userId = c.get("userId")!;
  const row = await c.env.DB.prepare(
    `WITH mine AS (
       SELECT
         id,
         CASE
           WHEN lister_user_id = ?1 THEN lister_last_read_at
           ELSE requester_last_read_at
         END AS last_read_at
       FROM negotiations
       WHERE is_deleted = 0
         AND (lister_user_id = ?1 OR requester_user_id = ?1)
     ),
     unread AS (
       SELECT negotiation_messages.negotiation_id
       FROM negotiation_messages
       JOIN mine ON mine.id = negotiation_messages.negotiation_id
       WHERE negotiation_messages.sender_user_id != ?1
         AND negotiation_messages.date_created > COALESCE(mine.last_read_at, 0)
     )
     SELECT
       COUNT(*) AS messages,
       COUNT(DISTINCT negotiation_id) AS threads
     FROM unread`
  )
    .bind(userId)
    .first<{ messages: number; threads: number }>();
  return c.json({
    messages: row?.messages ?? 0,
    threads: row?.threads ?? 0,
  });
});

// User-facing PATCH — currently only archive / unarchive their own row.
// (Soft-delete of negotiations is admin-only; users can hide via archive.)
negotiationRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const json = (await c.req.json().catch(() => null)) as
    | { isArchived?: boolean }
    | null;
  if (!json || typeof json.isArchived !== "boolean")
    return c.json({ error: "invalid_input" }, 400);

  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(negotiations)
    .where(eq(negotiations.id, id))
    .limit(1);
  const n = row[0];
  if (!n) return c.json({ error: "not_found" }, 404);
  if (n.listerUserId !== userId && n.requesterUserId !== userId)
    return c.json({ error: "forbidden" }, 403);
  await db
    .update(negotiations)
    .set({ isArchived: json.isArchived ? 1 : 0, dateModified: Date.now() })
    .where(eq(negotiations.id, id));
  return c.json({ ok: true });
});

// start a negotiation on a listing
negotiationRoutes.post("/", async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = NegotiationStartSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);

  const db = getDb(c.env.DB);
  const listingRow = await db
    .select()
    .from(listings)
    .where(eq(listings.id, parsed.data.listingId))
    .limit(1);
  const listing = listingRow[0];
  if (!listing || listing.isDeleted === 1 || listing.isArchived === 1)
    return c.json({ error: "listing_not_found" }, 404);
  if (listing.status !== "active")
    return c.json({ error: "listing_not_available" }, 400);
  if (listing.userId === userId)
    return c.json({ error: "cannot_negotiate_own_listing" }, 400);

  // Upsert-style — unique (listing_id, requester_user_id)
  const existing = await db
    .select()
    .from(negotiations)
    .where(
      and(
        eq(negotiations.listingId, listing.id),
        eq(negotiations.requesterUserId, userId)
      )
    )
    .limit(1);

  let negotiationId: string;
  const now = Date.now();
  const isNewProposal = !existing[0];
  if (existing[0]) {
    negotiationId = existing[0].id;
  } else {
    negotiationId = uuidv4();
    await db.insert(negotiations).values({
      id: negotiationId,
      listingId: listing.id,
      listerUserId: listing.userId,
      requesterUserId: userId,
      requesterLastReadAt: now,
      offering: parsed.data.offering,
    });
  }
  await db.insert(negotiationMessages).values({
    id: uuidv4(),
    negotiationId,
    senderUserId: userId,
    body: parsed.data.openingMessage,
  });
  await db
    .update(negotiations)
    .set({ requesterLastReadAt: now, dateModified: now })
    .where(eq(negotiations.id, negotiationId));

  c.executionCtx.waitUntil(
    notifyTradeParticipant(c.env, {
      recipientUserId: listing.userId,
      negotiationId,
      kind: isNewProposal ? "new_proposal" : "new_message",
    }).catch((error) => {
      console.error("[trade-email] proposal alert failed", error);
    })
  );

  return c.json({ id: negotiationId });
});

// fetch thread + messages
negotiationRoutes.get("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const readAt = Date.now();
  const row = await db
    .select()
    .from(negotiations)
    .where(eq(negotiations.id, id))
    .limit(1);
  const n = row[0];
  if (!n || n.isDeleted === 1)
    return c.json({ error: "not_found" }, 404);
  if (n.listerUserId !== userId && n.requesterUserId !== userId)
    return c.json({ error: "forbidden" }, 403);

  const [msgs, cs] = await Promise.all([
    db
      .select()
      .from(negotiationMessages)
      .where(eq(negotiationMessages.negotiationId, id))
      .orderBy(negotiationMessages.dateCreated),
    db
      .select()
      .from(contracts)
      .where(eq(contracts.negotiationId, id)),
    db
      .update(negotiations)
      .set(
        n.listerUserId === userId
          ? { listerLastReadAt: readAt }
          : { requesterLastReadAt: readAt }
      )
      .where(eq(negotiations.id, id)),
  ]);
  return c.json({ negotiation: n, messages: msgs, contracts: cs });
});

// post a message
negotiationRoutes.post("/:id/messages", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = NegotiationMessageSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(negotiations)
    .where(eq(negotiations.id, id))
    .limit(1);
  const n = row[0];
  if (!n) return c.json({ error: "not_found" }, 404);
  if (n.listerUserId !== userId && n.requesterUserId !== userId)
    return c.json({ error: "forbidden" }, 403);

  const msgId = uuidv4();
  const now = Date.now();
  await db.insert(negotiationMessages).values({
    id: msgId,
    negotiationId: id,
    senderUserId: userId,
    body: parsed.data.body,
  });
  await db
    .update(negotiations)
    .set(
      n.listerUserId === userId
        ? { listerLastReadAt: now, dateModified: now }
        : { requesterLastReadAt: now, dateModified: now }
    )
    .where(eq(negotiations.id, id));

  // Fan out to Durable Object subscribers if any are listening.
  try {
    const stub = c.env.NEGOTIATION.get(c.env.NEGOTIATION.idFromName(id));
    c.executionCtx.waitUntil(
      stub.fetch(`https://do/broadcast`, {
        method: "POST",
        body: JSON.stringify({
          type: "message",
          id: msgId,
          senderUserId: userId,
          body: parsed.data.body,
          at: now,
        }),
      })
    );
  } catch (e) {
    console.warn("[neg] DO fanout failed", e);
  }

  c.executionCtx.waitUntil(
    notifyTradeParticipant(c.env, {
      recipientUserId:
        n.listerUserId === userId ? n.requesterUserId : n.listerUserId,
      negotiationId: id,
      kind: "new_message",
    }).catch((error) => {
      console.error("[trade-email] reply alert failed", error);
    })
  );

  return c.json({ id: msgId });
});

// ---------------- AI: generate a contract draft (does NOT persist) ----------------
negotiationRoutes.post("/:id/contract/draft", async (c) => {
  return generateDraft(c, c.req.param("id"));
});

// ---------------- create a contract from agreed terms ----------------
negotiationRoutes.post("/:id/contract", async (c) => {
  return createContract(c, c.req.param("id"));
});

// websocket upgrade → forward to DO
negotiationRoutes.get("/:id/ws", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(negotiations)
    .where(eq(negotiations.id, id))
    .limit(1);
  const n = row[0];
  if (!n) return c.json({ error: "not_found" }, 404);
  if (n.listerUserId !== userId && n.requesterUserId !== userId)
    return c.json({ error: "forbidden" }, 403);

  const stub = c.env.NEGOTIATION.get(c.env.NEGOTIATION.idFromName(id));
  return stub.fetch(c.req.raw);
});
