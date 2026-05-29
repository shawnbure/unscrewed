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

export const negotiationRoutes = new Hono<AppContext>();

negotiationRoutes.use("*", requireAuth);

// list my negotiations
negotiationRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(negotiations)
    .where(
      and(
        eq(negotiations.isDeleted, 0),
        eq(negotiations.isArchived, 0),
        or(
          eq(negotiations.listerUserId, userId),
          eq(negotiations.requesterUserId, userId)
        )
      )
    );
  return c.json({ items: rows });
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
  if (existing[0]) {
    negotiationId = existing[0].id;
  } else {
    negotiationId = uuidv4();
    await db.insert(negotiations).values({
      id: negotiationId,
      listingId: listing.id,
      listerUserId: listing.userId,
      requesterUserId: userId,
      offering: parsed.data.offering,
    });
  }
  await db.insert(negotiationMessages).values({
    id: uuidv4(),
    negotiationId,
    senderUserId: userId,
    body: parsed.data.openingMessage,
  });

  return c.json({ id: negotiationId });
});

// fetch thread + messages
negotiationRoutes.get("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
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

  const msgs = await db
    .select()
    .from(negotiationMessages)
    .where(eq(negotiationMessages.negotiationId, id));
  const cs = await db
    .select()
    .from(contracts)
    .where(eq(contracts.negotiationId, id));
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
  await db.insert(negotiationMessages).values({
    id: msgId,
    negotiationId: id,
    senderUserId: userId,
    body: parsed.data.body,
  });

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
          at: Date.now(),
        }),
      })
    );
  } catch (e) {
    console.warn("[neg] DO fanout failed", e);
  }

  return c.json({ id: msgId });
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
