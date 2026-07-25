import type { Env } from "../env.js";
import { hmacSha256Hex } from "./crypto.js";

const FROM = "notifications@unscrewed.lol";
const PREFERENCE_PURPOSE = "trade-emails:v1";

export type TradeEmailKind =
  | "new_proposal"
  | "new_message"
  | "contract_ready"
  | "signature_needed"
  | "agreement_signed"
  | "completion_needed"
  | "trade_completed"
  | "contract_cancelled";

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
  dedupeId?: string;
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
  const dedupeKey = `trade-email:${input.kind}:${input.dedupeId ?? input.negotiationId}:${recipient.id}`;
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
  const content = {
    new_proposal: {
      subject: `New trade proposal: ${listingTitle}`,
      heading: "You have a new trade proposal",
      intro: "A neighbor sent a proposal for one of your listings.",
      cta: "Open private conversation",
    },
    new_message: {
      subject: `New trade reply: ${listingTitle}`,
      heading: "You have a new trade reply",
      intro: "A neighbor replied in one of your trade conversations.",
      cta: "Open private conversation",
    },
    contract_ready: {
      subject: `Trade agreement ready to review: ${listingTitle}`,
      heading: "A trade agreement is ready",
      intro:
        "The other trader prepared an agreement for you to review and sign only if it matches what you agreed.",
      cta: "Review agreement",
    },
    signature_needed: {
      subject: `Your signature is needed: ${listingTitle}`,
      heading: "The other trader has signed",
      intro:
        "The trade agreement is waiting for your review and signature. Sign only if every term is accurate.",
      cta: "Review and sign",
    },
    agreement_signed: {
      subject: `Trade agreement signed by both: ${listingTitle}`,
      heading: "Both traders have signed",
      intro:
        "The trade agreement now has both signatures. Keep using your judgment and the safety guidance for any meetup or exchange.",
      cta: "View signed agreement",
    },
    completion_needed: {
      subject: `Confirm the exchange when it is complete: ${listingTitle}`,
      heading: "The other trader confirmed completion",
      intro:
        "The other trader marked their side of the real-world exchange complete. Confirm yours only after you have actually given and received what you agreed.",
      cta: "Review and confirm",
    },
    trade_completed: {
      subject: `Both traders confirmed completion: ${listingTitle}`,
      heading: "The trade is complete",
      intro:
        "Both traders have now confirmed that the real-world exchange happened.",
      cta: "View completed trade",
    },
    contract_cancelled: {
      subject: `Trade agreement cancelled: ${listingTitle}`,
      heading: "The trade agreement was cancelled",
      intro:
        "The other trader cancelled the unsigned agreement. You can continue the private conversation if you want to revise the terms.",
      cta: "Open private conversation",
    },
  } satisfies Record<
    TradeEmailKind,
    { subject: string; heading: string; intro: string; cta: string }
  >;
  const emailContent = content[input.kind];
  const subject = emailContent.subject;
  const intro = emailContent.intro;
  const escapedIntro = escapeHtml(intro);
  const escapedTitle = escapeHtml(listingTitle);
  const escapedHeading = escapeHtml(emailContent.heading);
  const escapedCta = escapeHtml(emailContent.cta);

  await env.EMAIL.send({
    to: recipient.email,
    from: { email: FROM, name: "unscrewed" },
    subject,
    text: `${intro}

Listing: ${listingTitle}

${emailContent.cta}:
${tradeUrl}

This is a transactional alert about activity on your unscrewed account, not a marketing email. Manage these alerts:
${preferencesUrl}`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f5ef;color:#25231f;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <p style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#5a6f3b">UNSCREWED</p>
      <h1 style="font-size:24px;line-height:1.25;margin:16px 0 8px">${escapedHeading}</h1>
      <p style="font-size:16px;line-height:1.6">${escapedIntro}</p>
      <p style="font-size:15px;line-height:1.5"><strong>Listing:</strong> ${escapedTitle}</p>
      <p style="margin:28px 0">
        <a href="${escapedTradeUrl}" style="display:inline-block;background:#455d2a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 18px;font-weight:700">${escapedCta}</a>
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
    expirationTtl: input.kind === "new_message" ? 900 : 86_400,
  });
}
