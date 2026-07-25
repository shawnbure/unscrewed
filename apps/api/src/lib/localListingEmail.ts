import type { Env } from "../env.js";
import { uuidv4 } from "./crypto.js";
import { tradeEmailPreferenceToken } from "./tradeEmail.js";

const FROM = "notifications@unscrewed.lol";
const RADIUS_KM = 25;
const MAX_CANDIDATES = 100;
const MAX_SENDS_PER_LISTING = 20;
const DELIVERY_RETENTION_MS = 8 * 24 * 60 * 60 * 1000;

type LocalListingAlertInput = {
  listingId: string;
  ownerUserId: string;
  title: string;
  wants: string;
  postalCode: string;
  lat: number;
  lng: number;
  exchangeMode: "local" | "remote" | "either";
};

type Recipient = {
  id: string;
  email: string;
  email_normalized: string;
};

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

function compact(value: string, max: number): string {
  const normalized = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized.length > max
    ? `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`
    : normalized;
}

function bounds(lat: number, lng: number) {
  const latitudeDelta = RADIUS_KM / 111.32;
  const longitudeScale = Math.max(
    Math.cos((lat * Math.PI) / 180),
    0.1
  );
  const longitudeDelta = RADIUS_KM / (111.32 * longitudeScale);
  return [
    Math.max(-90, lat - latitudeDelta),
    Math.min(90, lat + latitudeDelta),
    Math.max(-180, lng - longitudeDelta),
    Math.min(180, lng + longitudeDelta),
  ] as const;
}

/**
 * Best-effort, explicitly opted-in local-supply alert.
 *
 * Callers attach this to waitUntil and catch failures so email availability
 * can never affect listing creation. Recipients must have opted in, verified
 * the address, and have a geocoded home ZIP within the coarse 25 km bounds.
 */
export async function notifyLocalListingWatchers(
  env: Env,
  input: LocalListingAlertInput
): Promise<void> {
  if (input.exchangeMode === "remote") return;
  const [south, north, west, east] = bounds(input.lat, input.lng);
  const candidates = await env.DB.prepare(
    `SELECT id, email, email_normalized
       FROM users
      WHERE id <> ?1
        AND is_deleted = 0
        AND is_archived = 0
        AND email_verified_at IS NOT NULL
        AND local_listing_notifications = 1
        AND home_lat IS NOT NULL
        AND home_lng IS NOT NULL
        AND ROUND(home_lat, 1) BETWEEN ?2 AND ?3
        AND ROUND(home_lng, 1) BETWEEN ?4 AND ?5
      ORDER BY
        ABS(ROUND(home_lat, 1) - ?6) +
        ABS(ROUND(home_lng, 1) - ?7)
      LIMIT ?8`
  )
    .bind(
      input.ownerUserId,
      south,
      north,
      west,
      east,
      input.lat,
      input.lng,
      MAX_CANDIDATES
    )
    .all<Recipient>();

  await env.DB.prepare(
    `DELETE FROM local_listing_email_deliveries
      WHERE date_created < ?1`
  )
    .bind(Date.now() - DELIVERY_RETENTION_MS)
    .run();

  const dayUtc = new Date().toISOString().slice(0, 10);
  const selected: Recipient[] = [];
  for (const recipient of candidates.results) {
    const reservation = await env.DB.prepare(
      `INSERT OR IGNORE INTO local_listing_email_deliveries
         (id, recipient_user_id, listing_id, day_utc, date_created)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
      .bind(
        uuidv4(),
        recipient.id,
        input.listingId,
        dayUtc,
        Date.now()
      )
      .run();
    if (reservation.meta.changes !== 1) continue;
    selected.push(recipient);
    if (selected.length >= MAX_SENDS_PER_LISTING) break;
  }

  const results = await Promise.allSettled(
    selected.map(async (recipient) => {
      const token = await tradeEmailPreferenceToken(
        env,
        recipient.id,
        recipient.email_normalized
      );
      const preferenceQuery = new URLSearchParams({
        u: recipient.id,
        t: token,
      });
      const preferencesUrl = `${env.PUBLIC_BASE_URL}/email-preferences?${preferenceQuery}`;
      const oneClickUnsubscribeUrl = `${env.API_BASE_URL}/email-preferences/unsubscribe-local?${preferenceQuery}`;
      const listingQuery = new URLSearchParams({
        utm_source: "local_watch",
        utm_medium: "email",
        utm_campaign: `new_local_trade:${input.listingId}`,
      });
      const listingUrl = `${env.PUBLIC_BASE_URL}/listing/${encodeURIComponent(input.listingId)}?${listingQuery}`;
      const title = compact(input.title, 100) || "New local trade";
      const wants = compact(input.wants, 220);
      const postalCode = compact(input.postalCode, 20);
      const location =
        postalCode && postalCode.toUpperCase() !== "USA"
          ? ` near ${/^\d{5}$/.test(postalCode) ? "ZIP " : ""}${postalCode}`
          : " near your home area";
      const subject = `New barter listing${location}: ${title}`;

      await env.EMAIL.send({
        to: recipient.email,
        from: { email: FROM, name: "unscrewed" },
        subject,
        text: `You asked to hear when a new barter listing appears near your home ZIP.

${title}${location}
Looking for: ${wants}

View the public listing:
${listingUrl}

This requested local-listing alert contains no private messages, exact address, or meetup details. At most one local-listing alert is sent to you each day.

Manage or turn off local-listing alerts:
${preferencesUrl}`,
        html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f5ef;color:#25231f;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <p style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#5a6f3b">UNSCREWED</p>
      <h1 style="font-size:24px;line-height:1.25;margin:16px 0 8px">A new barter listing is nearby</h1>
      <p style="font-size:15px;line-height:1.6">You asked to hear when a new listing appears near your home ZIP.</p>
      <p style="font-size:17px;line-height:1.5"><strong>${escapeHtml(title)}</strong>${escapeHtml(location)}</p>
      <p style="font-size:15px;line-height:1.5"><strong>Looking for:</strong> ${escapeHtml(wants)}</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(listingUrl)}" style="display:inline-block;background:#455d2a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 18px;font-weight:700">View public listing</a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#68645c">
        This requested alert contains no private messages, exact address, or meetup details.
        At most one local-listing alert is sent to you each day.
        <a href="${escapeHtml(preferencesUrl)}" style="color:#455d2a">Manage local-listing alerts</a>.
      </p>
    </div>
  </body>
</html>`,
        headers: {
          "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
    })
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (failure) throw failure.reason;
}
