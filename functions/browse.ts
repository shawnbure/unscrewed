interface PublicListingSummary {
  id: string;
  kind?: "good" | "service";
  exchangeMode?: "local" | "remote" | "either";
  title: string;
  description: string;
  wants: string;
  postalCode?: string | null;
}

interface PublicListingList {
  items?: PublicListingSummary[];
}

const SITE = "https://unscrewed.lol";
const API = "https://api.unscrewed.lol";
const BROWSE_URL = `${SITE}/browse`;
const IMAGE = `${SITE}/og.png`;
const TITLE = "Browse goods and skills to barter across the United States | unscrewed.lol";
const DESCRIPTION =
  "Browse real goods, services, and skills offered for local or remote barter across the United States. No listing fees or transaction fees.";

export async function onRequest(context: {
  request: Request;
}): Promise<Response> {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const requestUrl = new URL(context.request.url);
  const [indexResponse, listings] = await Promise.all([
    fetch(`${requestUrl.origin}/index.html`),
    loadListings(),
  ]);
  if (!indexResponse.ok) {
    return new Response("Site unavailable", { status: 503 });
  }

  let html = await indexResponse.text();
  html = replaceMeta(html, 'name="description"', DESCRIPTION).replace(
    '<link rel="canonical" href="https://unscrewed.lol/" />',
    `<link rel="canonical" href="${BROWSE_URL}" />`
  );
  html = replaceMeta(html, 'property="og:url"', BROWSE_URL);
  html = replaceMeta(html, 'property="og:title"', TITLE);
  html = replaceMeta(html, 'property="og:description"', DESCRIPTION);
  html = replaceMeta(html, 'property="og:image"', IMAGE);
  html = replaceMeta(
    html,
    'property="og:image:alt"',
    "Neighbors exchanging goods, tools, and skills through unscrewed.lol"
  );
  html = replaceMeta(html, 'name="twitter:title"', TITLE);
  html = replaceMeta(html, 'name="twitter:description"', DESCRIPTION);
  html = replaceMeta(html, 'name="twitter:image"', IMAGE);
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(TITLE)}</title>`
  );

  // Filtered browse URLs are useful to people, but the stable collection URL
  // is the search result we want indexed. Exact ZIP inventory has its own
  // server-rendered /circle/:zip landing page.
  if (requestUrl.search) {
    html = html.replace(
      "</head>",
      '    <meta name="robots" content="noindex,follow" />\n  </head>'
    );
  }

  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: BROWSE_URL,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "unscrewed.lol",
      url: SITE,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: listings.length,
      itemListElement: listings.map((listing, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: listingUrl(listing.id),
        name: compact(listing.title),
      })),
    },
  }).replaceAll("<", "\\u003c");
  html = html.replace(
    "</head>",
    `    <script type="application/ld+json">${structuredData}</script>\n  </head>`
  );
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${browseSnapshot(listings)}</div>`
  );

  return new Response(context.request.method === "HEAD" ? null : html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff",
    },
  });
}

async function loadListings(): Promise<PublicListingSummary[]> {
  try {
    const response = await fetch(`${API}/listings?limit=40`, {
      method: "GET",
      // @ts-expect-error Cloudflare-only fetch options
      cf: { cacheEverything: true, cacheTtl: 60 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PublicListingList;
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    // Discovery metadata must never make the interactive browse page fail.
    return [];
  }
}

function browseSnapshot(listings: PublicListingSummary[]): string {
  const items = listings
    .map((listing) => {
      const exchange =
        listing.exchangeMode === "remote"
          ? "Remote trade"
          : listing.exchangeMode === "either"
            ? "Local or remote trade"
            : listing.postalCode?.trim()
              ? `Local trade near ${compact(listing.postalCode)}`
              : "Local trade";
      return `<li>
        <article>
          <p>${escapeHtml(exchange)}</p>
          <h2><a href="${listingUrl(listing.id)}">${escapeHtml(compact(listing.title))}</a></h2>
          <p>${escapeHtml(compact(listing.description))}</p>
          <p><strong>Requested in return:</strong> ${escapeHtml(compact(listing.wants))}</p>
        </article>
      </li>`;
    })
    .join("");
  const results = items
    ? `<p>${listings.length} active trade${listings.length === 1 ? "" : "s"} available now.</p><ul>${items}</ul>`
    : "<p>There are no active trades right now. A real market starts when someone posts one useful item, service, or skill.</p>";

  return `<main id="browse-server-snapshot">
    <h1>Browse goods and skills to barter</h1>
    <p>Explore real offers for local or remote exchange across the United States. unscrewed.lol charges no listing fees or transaction fees.</p>
    ${results}
    <p><a href="${SITE}/signup?next=%2Fpost">Post a real offer and start a trade</a></p>
  </main>`;
}

function listingUrl(id: string): string {
  return `${SITE}/listing/${encodeURIComponent(id)}`;
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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
