// Contract endpoints — drafting via AI, persisting, and signing.
// Read/edit happens through /negotiations/:id (which already returns the
// attached contracts). The contracts themselves live under /contracts/:id
// for direct read + the sign action.

import { Hono } from "hono";
import { z } from "zod";
import { and, eq, isNull, ne } from "drizzle-orm";
import {
  getDb,
  listings,
  negotiations,
  negotiationMessages,
  contracts,
  users,
} from "@unscrewed/db";
import { ContractTerms } from "@unscrewed/shared";
import type { AppContext } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { uuidv4 } from "../lib/crypto.js";
import { draftContractTerms } from "../lib/contractAi.js";
import { notifyTradeParticipant } from "../lib/tradeEmail.js";

export const contractsRoutes = new Hono<AppContext>();
contractsRoutes.use("*", requireAuth);

// ----------------------------------------------------------------------
// GET /contracts — list contracts the caller is a party to, joined with
// the listing for context.
// Optional query: ?status=draft|awaiting_signatures|signed|cancelled|all
// (default: everything not cancelled)
// ----------------------------------------------------------------------
contractsRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;
  const status = new URL(c.req.url).searchParams.get("status") ?? "active";
  let where = "c.status != 'cancelled'";
  if (status !== "active" && status !== "all") {
    where = `c.status = '${status.replace(/'/g, "''")}'`;
  } else if (status === "all") {
    where = "1=1";
  }
  const rows = await c.env.DB.prepare(
    `SELECT c.*,
            l.title    AS listing_title,
            l.kind     AS listing_kind,
            l.category AS listing_category,
            (SELECT lp.r2_key FROM listing_photos lp
              WHERE lp.listing_id = l.id ORDER BY lp.sort_order LIMIT 1)
                                AS firstPhotoKey
       FROM contracts c
       JOIN listings l ON l.id = c.listing_id
      WHERE (c.party_a_user_id = ?1 OR c.party_b_user_id = ?1)
        AND ${where}
      ORDER BY c.date_modified DESC`
  )
    .bind(userId)
    .all();
  return c.json({ items: rows.results });
});

// ----------------------------------------------------------------------
// GET /contracts/:id — returns a contract if the caller is one of the two
//                      parties on it.
// ----------------------------------------------------------------------
contractsRoutes.get("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  const ct = row[0];
  if (!ct) return c.json({ error: "not_found" }, 404);
  if (ct.partyAUserId !== userId && ct.partyBUserId !== userId)
    return c.json({ error: "forbidden" }, 403);
  return c.json({ contract: ct });
});

// ----------------------------------------------------------------------
// POST /contracts/:id/sign — record this user's signature.
//                            Body: { typedName: string }
//                            When both parties have signed, status flips
//                            to 'signed' and the listing is marked 'traded'.
// ----------------------------------------------------------------------
const SignSchema = z.object({
  typedName: z.string().min(2).max(120),
});

contractsRoutes.post("/:id/sign", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = SignSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);

  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  const ct = row[0];
  if (!ct) return c.json({ error: "not_found" }, 404);
  if (ct.partyAUserId !== userId && ct.partyBUserId !== userId)
    return c.json({ error: "forbidden" }, 403);
  if (ct.status === "cancelled")
    return c.json({ error: "cancelled" }, 400);
  if (ct.status === "signed")
    return c.json({ error: "already_signed" }, 400);

  const isA = ct.partyAUserId === userId;
  if (isA && ct.partyASignedAt)
    return c.json({ error: "you_already_signed" }, 400);
  if (!isA && ct.partyBSignedAt)
    return c.json({ error: "you_already_signed" }, 400);

  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim();

  const now = Date.now();
  const upd: Record<string, unknown> = { dateModified: now };
  if (isA) {
    upd.partyASignedName = parsed.data.typedName;
    upd.partyASignedAt = now;
    upd.partyASignedIp = ip;
  } else {
    upd.partyBSignedName = parsed.data.typedName;
    upd.partyBSignedAt = now;
    upd.partyBSignedIp = ip;
  }

  if (ct.status === "draft") {
    upd.status = "awaiting_signatures";
  }

  // The conditional update prevents a stale request from signing after a
  // cancellation or completion. RETURNING observes the entire row after this
  // signature lands, including a near-simultaneous signature by the other
  // party, so one of the two requests always sees that both are present.
  const signedRows = await db
    .update(contracts)
    .set(upd as any)
    .where(
      and(
        eq(contracts.id, id),
        ne(contracts.status, "cancelled"),
        ne(contracts.status, "signed"),
        isA
          ? isNull(contracts.partyASignedAt)
          : isNull(contracts.partyBSignedAt)
      )
    )
    .returning();
  const afterSignature = signedRows[0];
  if (!afterSignature) {
    const [current] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .limit(1);
    let conflictError = "signature_conflict";
    if (current?.status === "cancelled") conflictError = "cancelled";
    else if (current?.status === "signed") conflictError = "already_signed";
    else if (isA ? current?.partyASignedAt : current?.partyBSignedAt)
      conflictError = "you_already_signed";
    return c.json({ error: conflictError }, 409);
  }

  const bothSigning = Boolean(
    afterSignature.partyASignedAt && afterSignature.partyBSignedAt
  );
  let completed = false;
  if (bothSigning) {
    const finalized = await db
      .update(contracts)
      .set({
        status: "signed",
        tosVersionAtSigning: c.env.TOS_VERSION,
        dateModified: now,
      })
      .where(
        and(eq(contracts.id, id), ne(contracts.status, "cancelled"))
      )
      .returning({ id: contracts.id });
    completed = Boolean(finalized[0]);
  }

  // Cascade lifecycle updates only after the signed status is authoritative.
  if (completed) {
    await db
      .update(listings)
      .set({ status: "traded", dateModified: now })
      .where(eq(listings.id, ct.listingId));
    await db
      .update(negotiations)
      .set({ status: "signed", dateModified: now })
      .where(eq(negotiations.id, ct.negotiationId));
  } else if (!bothSigning && ct.status === "draft") {
    await db
      .update(negotiations)
      .set({ status: "contract_drafted", dateModified: now })
      .where(eq(negotiations.id, ct.negotiationId));
  }

  if (!bothSigning || completed) {
    c.executionCtx.waitUntil(
      notifyTradeParticipant(c.env, {
        recipientUserId: isA ? ct.partyBUserId : ct.partyAUserId,
        negotiationId: ct.negotiationId,
        kind: completed ? "trade_completed" : "signature_needed",
        dedupeId: ct.id,
      }).catch((error) => {
        console.error("[trade-email] signature alert failed", error);
      })
    );
  }

  // Return the fresh row.
  const fresh = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  return c.json({ contract: fresh[0] });
});

// ----------------------------------------------------------------------
// POST /contracts/:id/cancel — either party can cancel an awaiting-signature
//                              contract. Signed contracts are immutable.
// ----------------------------------------------------------------------
contractsRoutes.post("/:id/cancel", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .limit(1);
  const ct = row[0];
  if (!ct) return c.json({ error: "not_found" }, 404);
  if (ct.partyAUserId !== userId && ct.partyBUserId !== userId)
    return c.json({ error: "forbidden" }, 403);
  if (ct.status === "signed")
    return c.json({ error: "cannot_cancel_signed" }, 400);
  await db
    .update(contracts)
    .set({ status: "cancelled", dateModified: Date.now() })
    .where(eq(contracts.id, id));
  await db
    .update(negotiations)
    .set({ status: "open", dateModified: Date.now() })
    .where(eq(negotiations.id, ct.negotiationId));
  c.executionCtx.waitUntil(
    notifyTradeParticipant(c.env, {
      recipientUserId:
        ct.partyAUserId === userId ? ct.partyBUserId : ct.partyAUserId,
      negotiationId: ct.negotiationId,
      kind: "contract_cancelled",
      dedupeId: ct.id,
    }).catch((error) => {
      console.error("[trade-email] cancellation alert failed", error);
    })
  );
  return c.json({ ok: true });
});

// ----------------------------------------------------------------------
// Helpers shared with the negotiation route for AI drafting + persisting.
// Mounted under /negotiations/:id/contract/* via the negotiation router.
// ----------------------------------------------------------------------
export async function generateDraft(
  c: any,
  negotiationId: string
): Promise<Response> {
  const userId = c.get("userId") as string;
  const db = getDb(c.env.DB);
  const negRow = await db
    .select()
    .from(negotiations)
    .where(eq(negotiations.id, negotiationId))
    .limit(1);
  const n = negRow[0];
  if (!n || n.isDeleted === 1)
    return c.json({ error: "not_found" }, 404);
  if (n.listerUserId !== userId && n.requesterUserId !== userId)
    return c.json({ error: "forbidden" }, 403);

  const [listingRow, listerRow, requesterRow, msgRows] = await Promise.all([
    db.select().from(listings).where(eq(listings.id, n.listingId)).limit(1),
    db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, n.listerUserId))
      .limit(1),
    db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, n.requesterUserId))
      .limit(1),
    db
      .select()
      .from(negotiationMessages)
      .where(eq(negotiationMessages.negotiationId, n.id)),
  ]);
  const listing = listingRow[0];
  if (!listing) return c.json({ error: "listing_gone" }, 404);

  const terms = await draftContractTerms(c.env, {
    listingTitle: listing.title,
    listingDescription: listing.description,
    listerName: listerRow[0]?.displayName ?? "the lister",
    listerWants: listing.wants,
    requesterName: requesterRow[0]?.displayName ?? "the requester",
    requesterOffering: n.offering,
    messages: msgRows.map((m) => ({
      sender: m.senderUserId === n.listerUserId ? "lister" : "requester",
      body: m.body,
    })),
  });

  return c.json({ terms });
}

const CreateContractSchema = z.object({
  terms: ContractTerms,
});

export async function createContract(
  c: any,
  negotiationId: string
): Promise<Response> {
  const userId = c.get("userId") as string;
  const json = await c.req.json().catch(() => null);
  const parsed = CreateContractSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);

  const db = getDb(c.env.DB);
  const negRow = await db
    .select()
    .from(negotiations)
    .where(eq(negotiations.id, negotiationId))
    .limit(1);
  const n = negRow[0];
  if (!n || n.isDeleted === 1)
    return c.json({ error: "not_found" }, 404);
  if (n.listerUserId !== userId && n.requesterUserId !== userId)
    return c.json({ error: "forbidden" }, 403);

  // Cancel any prior awaiting_signatures contract on this negotiation so
  // we don't end up with duplicates. A signed contract blocks new drafts.
  const existing = await db
    .select()
    .from(contracts)
    .where(eq(contracts.negotiationId, negotiationId));
  if (existing.some((x) => x.status === "signed"))
    return c.json({ error: "already_signed" }, 400);
  for (const old of existing) {
    if (old.status === "draft" || old.status === "awaiting_signatures") {
      await db
        .update(contracts)
        .set({ status: "cancelled", dateModified: Date.now() })
        .where(eq(contracts.id, old.id));
    }
  }

  const id = uuidv4();
  const now = Date.now();
  await db.insert(contracts).values({
    id,
    negotiationId,
    listingId: n.listingId,
    partyAUserId: n.listerUserId,
    partyBUserId: n.requesterUserId,
    termsJson: JSON.stringify(parsed.data.terms),
    status: "awaiting_signatures",
    dateCreated: now,
    dateModified: now,
  });
  await db
    .update(negotiations)
    .set({ status: "contract_drafted", dateModified: now })
    .where(eq(negotiations.id, negotiationId));

  c.executionCtx.waitUntil(
    notifyTradeParticipant(c.env, {
      recipientUserId:
        n.listerUserId === userId ? n.requesterUserId : n.listerUserId,
      negotiationId,
      kind: "contract_ready",
      dedupeId: id,
    }).catch((error) => {
      console.error("[trade-email] agreement alert failed", error);
    })
  );

  return c.json({ id });
}
