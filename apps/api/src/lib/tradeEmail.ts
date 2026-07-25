import type { Env } from "../env.js";
import { hmacSha256Hex } from "./crypto.js";

const FROM = "notifications@unscrewed.lol";
const PREFERENCE_PURPOSE = "trade-emails:v1";

export type TradeEmailKind = "new_proposal" | "new_message";

export async function tradeEmailPreferenceToken(
  env: Env,
  userId: string,
  emailNormalized: string
): Promise<string> {
  return hmacSha256Hex(
    env.SESSION_SECRET,
    `${PREFERENCE_PURPOSE}:${userId}:${emailNormalized}`
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char]!
  );
}

function safeSubjectPart(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 100);
}

type NotifyTradeInput = {
  recipientUserId: string;
  negotiationId: string;
  kind: TradeEmailKind;
};

/**
 * Best-effort transactional alert. Callers must attach this to waitUntil and
 * catch failures so email availability can never affect the trade itself.
 */
export async function notifyTradeParticipant(
  env: Env,
  input: NotifyTradeInput
): Promise<void> {
  const recipient = await env.DB.prepare(
    `SELECT u.id, u.email, u.email_normalized, l.title AS listing_title
       FROM users u
       JOIN negotiations n ON n.id = ?2
       JOIN listings l ON l.id = n.listing_id
      WHERE u.id = ?1
        AND u.is_deleted = 0
        AND u.is_archived = 0
        AND u.email_verified_at IS NOT NULL
        AND u.trade_email_notifications = 1`
  )
    .bind(input.recipientUserId, input.negotiationId)
    .first<{
      id: string;
      email: string;
      email_normalized: string;
      listing_title: string;
    }>();
  if (!recipient?.email) return;

  // A burst of chat messages should produce one prompt, not a noisy inbox.
  // A newly-created proposal gets a longer dedupe window for retrying clients.
  const dedupeKey = `trade-email:${input.kind}:${input.negotiationId}:${recipient.id}`;
  if (await env.RATE_LIMIT.get(dedupeKey)) return;

  const token = await tradeEmailPreferenceToken(
    env,
    recipient.id,
    recipient.email_normalized
  );
  const query = new URLSearchParams({ u: recipient.id, t: token });
  const preferencesUrl = `${env.PUBLIC_BASE_URL}/email-preferences?${query}`;
  const tradeUrl = `${env.PUBLIC_BASE_URL}/n/${encodeURIComponent(input.negotiationId)}`;
  const escapedPreferencesUrl = escapeHtml(preferencesUrl);
  const escapedTradeUrl = escapeHtml(tradeUrl);
  const listingTitle =
    safeSubjectPart(recipient.listing_title) || "your listing";
  const isProposal = input.kind === "new_proposal";
  const subject = isProposal
    ? `New trade proposal: ${listingTitle}`
    : `New trade reply: ${listingTitle}`;
  const intro = isProposal
    ? "A neighbor sent a proposal for one of your listings."
    : "A neighbor replied in one of your trade conversations.";
  const escapedIntro = escapeHtml(intro);
  const escapedTitle = escapeHtml(listingTitle);

  await env.EMAIL.send({
    to: recipient.email,
    from: { email: FROM, name: "unscrewed" },
    subject,
    text: `${intro}

Listing: ${listingTitle}

Open the private trade conversation:
${tradeUrl}

This is a transactional alert about activity on your unscrewed account, not a marketing email. Manage these alerts:
${preferencesUrl}`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f5ef;color:#25231f;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <p style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#5a6f3b">UNSCREWED</p>
      <h1 style="font-size:24px;line-height:1.25;margin:16px 0 8px">${isProposal ? "You have a new trade proposal" : "You have a new trade reply"}</h1>
      <p style="font-size:16px;line-height:1.6">${escapedIntro}</p>
      <p style="font-size:15px;line-height:1.5"><strong>Listing:</strong> ${escapedTitle}</p>
      <p style="margin:28px 0">
        <a href="${escapedTradeUrl}" style="display:inline-block;background:#455d2a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 18px;font-weight:700">Open private conversation</a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#68645c">
        This is a transactional account alert, not a marketing email.
        <a href="${escapedPreferencesUrl}" style="color:#455d2a">Manage trade email alerts</a>.
      </p>
    </div>
  </body>
</html>`,
    headers: {
      "List-Unsubscribe": `<${preferencesUrl}>`,
    },
  });

  await env.RATE_LIMIT.put(dedupeKey, "1", {
    expirationTtl: isProposal ? 86_400 : 900,
  });
}
