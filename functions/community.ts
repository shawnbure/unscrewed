interface PublicStats {
  members_total: number;
  listings_active: number;
  listings_this_month: number;
  two_sided_conversations: number;
  completed_trades: number;
  map_min_cluster_size: number;
  map_clusters: Array<{ zip3: string; count: number }>;
  updated_at: number;
}

const SITE = "https://unscrewed.lol";
const API = "https://api.unscrewed.lol";
const COMMUNITY_URL = `${SITE}/community`;
const TITLE = "The unscrewed.lol barter community — real members, listings, and trades";
const DESCRIPTION =
  "See verified marketplace totals for members, active barter listings, two-sided conversations, and completed trades. Broad location data appears only after a privacy threshold is met.";
const IMAGE = `${SITE}/movement-og.png`;

export async function onRequest(context: {
  request: Request;
}): Promise<Response> {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const requestUrl = new URL(context.request.url);
  const [indexResponse, stats] = await Promise.all([
    fetch(`${requestUrl.origin}/index.html`),
    loadStats(),
  ]);
  if (!indexResponse.ok) {
    return new Response("Site unavailable", { status: 503 });
  }

  let html = await indexResponse.text();
  html = replaceMeta(html, 'name="description"', DESCRIPTION).replace(
    '<link rel="canonical" href="https://unscrewed.lol/" />',
    `<link rel="canonical" href="${COMMUNITY_URL}" />`
  );
  html = replaceMeta(html, 'property="og:url"', COMMUNITY_URL);
  html = replaceMeta(html, 'property="og:title"', TITLE);
  html = replaceMeta(html, 'property="og:description"', DESCRIPTION);
  html = replaceMeta(html, 'property="og:image"', IMAGE);
  html = replaceMeta(
    html,
    'property="og:image:alt"',
    "A public-benefit barter movement growing one real exchange at a time"
  );
  html = replaceMeta(html, 'name="twitter:title"', TITLE);
  html = replaceMeta(html, 'name="twitter:description"', DESCRIPTION);
  html = replaceMeta(html, 'name="twitter:image"', IMAGE);
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(TITLE)}</title>`
  );

  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: TITLE,
    description: DESCRIPTION,
    url: COMMUNITY_URL,
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "unscrewed.lol",
      url: SITE,
    },
    dateModified: stats
      ? new Date(stats.updated_at).toISOString()
      : undefined,
    mainEntity: {
      "@type": "Organization",
      name: "unscrewed.lol",
      url: SITE,
      description:
        "An independent public-benefit barter marketplace for trading goods and skills locally or remotely across the United States.",
    },
  }).replaceAll("<", "\\u003c");
  html = html.replace(
    "</head>",
    `    <script type="application/ld+json">${structuredData}</script>\n  </head>`
  );
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${communitySnapshot(stats)}</div>`
  );

  return new Response(context.request.method === "HEAD" ? null : html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff",
    },
  });
}

async function loadStats(): Promise<PublicStats | null> {
  try {
    const response = await fetch(`${API}/stats`, {
      method: "GET",
      // @ts-expect-error Cloudflare-only fetch options
      cf: { cacheEverything: true, cacheTtl: 60 },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as Partial<PublicStats>;
    return validStats(payload) ? payload : null;
  } catch {
    // Metadata must not make the interactive community page unavailable.
    return null;
  }
}

function validStats(value: Partial<PublicStats>): value is PublicStats {
  return (
    nonnegative(value.members_total) &&
    nonnegative(value.listings_active) &&
    nonnegative(value.listings_this_month) &&
    nonnegative(value.two_sided_conversations) &&
    nonnegative(value.completed_trades) &&
    nonnegative(value.map_min_cluster_size) &&
    Array.isArray(value.map_clusters) &&
    typeof value.updated_at === "number" &&
    Number.isFinite(value.updated_at)
  );
}

function nonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function communitySnapshot(stats: PublicStats | null): string {
  const evidence = stats
    ? `<dl>
        <div><dt>Members</dt><dd>${stats.members_total.toLocaleString("en-US")}</dd></div>
        <div><dt>Active listings</dt><dd>${stats.listings_active.toLocaleString("en-US")}</dd></div>
        <div><dt>Listings posted this month</dt><dd>${stats.listings_this_month.toLocaleString("en-US")}</dd></div>
        <div><dt>Two-sided conversations</dt><dd>${stats.two_sided_conversations.toLocaleString("en-US")}</dd></div>
        <div><dt>Completed trades</dt><dd>${stats.completed_trades.toLocaleString("en-US")}</dd></div>
      </dl>
      <p>Updated ${escapeHtml(new Date(stats.updated_at).toISOString())}. These are marketplace outcomes, not projected impact.</p>
      <p>Broad ZIP-3 areas appear only after at least ${stats.map_min_cluster_size.toLocaleString("en-US")} members meet the privacy threshold. ${stats.map_clusters.length === 0 ? "No area meets that threshold yet." : `${stats.map_clusters.length.toLocaleString("en-US")} broad area${stats.map_clusters.length === 1 ? " meets" : "s meet"} it now.`}</p>`
    : "<p>Live marketplace totals are temporarily unavailable. The interactive page will retry without inventing a number.</p>";

  return `<main id="community-server-snapshot">
    <h1>The barter community, so far</h1>
    <p>unscrewed.lol publishes real member, listing, conversation, and independently confirmed trade totals so early activity is not mistaken for adoption.</p>
    ${evidence}
    <p><a href="${SITE}/browse">Browse real offers</a> or <a href="${SITE}/signup?next=%2Fpost">post one useful item or skill</a>.</p>
    <p><a href="${SITE}/public-benefit">Read the public-benefit commitments</a>.</p>
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
