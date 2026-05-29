// Contract endpoints — drafting via AI, persisting, and signing.
// Read/edit happens through /negotiations/:id (which already returns the
// attached contracts). The contracts themselves live under /contracts/:id
// for direct read + the sign action.

import { Hono } from "hono";
import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
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

export const contractsRoutes = new Hono<AppContext>();
contractsRoutes.use("*", requireAuth);

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

  // Determine if this signature completes the contract.
  const bothSigning =
    (isA ? true : Boolean(ct.partyASignedAt)) &&
    (isA ? Boolean(ct.partyBSignedAt) : true);
  if (bothSigning) {
    upd.status = "signed";
    upd.tosVersionAtSigning = c.env.TOS_VERSION;
  } else if (ct.status === "draft") {
    upd.status = "awaiting_signatures";
  }

  await db.update(contracts).set(upd as any).where(eq(contracts.id, id));

  // Cascade lifecycle updates when both parties have signed.
  if (bothSigning) {
    await db
      .update(listings)
      .set({ status: "traded", dateModified: now })
      .where(eq(listings.id, ct.listingId));
    await db
      .update(negotiations)
      .set({ status: "signed", dateModified: now })
      .where(eq(negotiations.id, ct.negotiationId));
  } else if (ct.status === "draft") {
    await db
      .update(negotiations)
      .set({ status: "contract_drafted", dateModified: now })
      .where(eq(negotiations.id, ct.negotiationId));
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

  return c.json({ id });
}
