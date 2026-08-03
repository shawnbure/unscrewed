interface PublicListing {
  id: string;
  kind?: "good" | "service";
  title: string;
  description: string;
  wants: string;
  postalCode?: string | null;
  exchangeMode?: "local" | "remote" | "either";
}

interface PublicPhoto {
  r2Key?: string | null;
}

interface ListingResponse {
  listing: PublicListing;
  photos: PublicPhoto[];
}

interface FunctionContext {
  request: Request;
  params: { id?: string | string[] };
}

const SITE = "https://unscrewed.lol";
const API = "https://api.unscrewed.lol";
const DEFAULT_IMAGE = `${SITE}/og.png`;

export async function onRequest(context: FunctionContext): Promise<Response> {
  if (context.request.method !== "GET" && context.request.method !== "HEAD")
    return new Response("Method not allowed", { status: 405 });

  const rawId = context.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return new Response("Trade not found", { status: 404 });

  const listingResponse = await fetch(
    `${API}/listings/${encodeURIComponent(id)}`,
    {
      method: "GET",
      // @ts-expect-error Cloudflare-only fetch options
      cf: { cacheEverything: true, cacheTtl: 300 },
    }
  );
  if (!listingResponse.ok)
    return new Response("Trade not found", {
      status: listingResponse.status === 404 ? 404 : 503,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-robots-tag": "noindex",
      },
    });

  const payload = (await listingResponse.json()) as ListingResponse;
  const listing = payload.listing;
  const canonical = `${SITE}/listing/${encodeURIComponent(listing.id)}`;
  const location =
    listing.exchangeMode === "remote"
      ? " remotely"
      : listing.exchangeMode === "either"
        ? " locally or remotely"
        : listing.postalCode?.trim()
          ? ` near ${listing.postalCode.trim()}`
          : "";
  const title = truncate(
    `${compact(listing.title)} — barter${location} | unscrewed.lol`,
    90
  );
  const requestedReturn = withoutRequestedReturnLeadIn(listing.wants);
  const description = truncate(
    `Looking to trade for ${withoutTrailingPunctuation(requestedReturn)}. ${compact(listing.description)}`,
    160
  );
  const firstPhoto = payload.photos.find((photo) => photo.r2Key)?.r2Key;
  const image = firstPhoto
    ? `${API}/listings/photos/${encodeURIComponent(firstPhoto)}`
    : DEFAULT_IMAGE;
  const imageAlt = firstPhoto
    ? `Photo for ${compact(listing.title)}`
    : "Neighbors exchanging goods, tools, and skills through unscrewed.lol";

  const requestUrl = new URL(context.request.url);
  const indexResponse = await fetch(`${requestUrl.origin}/index.html`);
  if (!indexResponse.ok)
    return new Response("Site unavailable", { status: 503 });

  let html = await indexResponse.text();
  html = replaceMeta(html, 'name="description"', description).replace(
    '<link rel="canonical" href="https://unscrewed.lol/" />',
    `<link rel="canonical" href="${canonical}" />`
  );
  html = replaceMeta(html, 'property="og:url"', canonical);
  html = replaceMeta(html, 'property="og:title"', title);
  html = replaceMeta(html, 'property="og:description"', description);
  html = replaceMeta(html, 'property="og:image"', image);
  html = replaceMeta(html, 'property="og:image:alt"', imageAlt);
  if (firstPhoto) {
    html = html.replace(
      /\s*<meta property="og:image:(?:width|height)"[^>]*\/>/g,
      ""
    );
  }
  html = replaceMeta(html, 'name="twitter:title"', title);
  html = replaceMeta(html, 'name="twitter:description"', description);
  html = replaceMeta(html, 'name="twitter:image"', image);
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`
  );
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${listingSnapshot(listing, requestedReturn, canonical, location)}</div>`
  );

  return new Response(context.request.method === "HEAD" ? null : html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff",
    },
  });
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function withoutTrailingPunctuation(value: string): string {
  return compact(value).replace(/[.!?]+$/, "");
}

// Keep aligned with packages/shared/src/listings.ts. Pages Functions compile
// independently and cannot resolve the workspace package at this boundary.
export function withoutRequestedReturnLeadIn(value: string): string {
  const compactValue = compact(value);
  const withoutLeadIn = compactValue
    .replace(
      /^(?:(?:i(?:['’]m| am)\s+)?looking\s+for|in\s+(?:trade|exchange))\s*:\s*/i,
      ""
    )
    .trim();
  return withoutLeadIn || compactValue;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function listingSnapshot(
  listing: PublicListing,
  requestedReturn: string,
  canonical: string,
  location: string
): string {
  const offerType =
    listing.kind === "service"
      ? "service"
      : listing.kind === "good"
        ? "item"
        : "offer";
  return `<main id="listing-server-snapshot">
      <article>
        <p>Active ${offerType} offered for barter${escapeHtml(location)}.</p>
        <h1>${escapeHtml(compact(listing.title))}</h1>
        <p>${escapeHtml(compact(listing.description))}</p>
        <h2>Requested in return</h2>
        <p>${escapeHtml(requestedReturn)}</p>
        <p><a href="${escapeHtml(`${canonical}?propose=1`)}">View this trade and propose an exchange</a></p>
      </article>
    </main>`;
}

function replaceMeta(html: string, selector: string, content: string): string {
  const pattern = new RegExp(
    `<meta ([^>]*${escapeRegExp(selector)}[^>]*)content="[^"]*"([^>]*)\\/>`
  );
  return html.replace(pattern, `<meta $1content="${escapeHtml(content)}"$2/>`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
