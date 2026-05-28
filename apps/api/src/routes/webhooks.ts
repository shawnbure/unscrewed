import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, smsLog } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { uuidv4 } from "../lib/crypto.js";

export const webhookRoutes = new Hono<AppContext>();

// Telnyx delivery receipts + inbound SMS.
// Configure in Telnyx portal: messaging profile → inbound webhook URL →
//   https://api.unscrewed.lol/webhooks/telnyx
//
// TODO: validate the Telnyx-Signature-Ed25519 header against the messaging
// profile's public key. Stubbed for now.
webhookRoutes.post("/telnyx", async (c) => {
  const json = (await c.req.json().catch(() => null)) as any;
  if (!json) return c.json({ error: "bad_payload" }, 400);

  const data = json.data ?? json;
  const eventType: string | undefined = data?.event_type ?? data?.type;
  const payload = data?.payload ?? data;
  const db = getDb(c.env.DB);

  if (eventType?.startsWith("message.")) {
    // delivery receipt
    const messageId: string | undefined = payload?.id;
    const status: string | undefined =
      payload?.to?.[0]?.status ?? payload?.status;
    if (messageId) {
      // Try to update existing log row by telnyx_message_id; if none, insert.
      const existing = await db
        .select({ id: smsLog.id })
        .from(smsLog)
        .where(eq(smsLog.telnyxMessageId, messageId))
        .limit(1);
      if (existing[0]) {
        await db
          .update(smsLog)
          .set({ status, dateModified: Date.now() })
          .where(eq(smsLog.id, existing[0].id));
      } else {
        await db.insert(smsLog).values({
          id: uuidv4(),
          direction:
            payload?.direction === "inbound" ? "inbound" : "outbound",
          toNumber: payload?.to?.[0]?.phone_number ?? "",
          fromNumber: payload?.from?.phone_number,
          telnyxMessageId: messageId,
          status,
          body: payload?.text?.slice(0, 1000),
        });
      }
    }
  }

  return c.json({ ok: true });
});
