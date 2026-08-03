interface PublicPostSummary {
  slug: string;
  title: string;
  excerpt?: string | null;
  datePublished?: number | null;
  authorName?: string | null;
}

interface PublicPostList {
  items?: PublicPostSummary[];
}

const SITE = "https://unscrewed.lol";
const API = "https://api.unscrewed.lol";
const BLOG_URL = `${SITE}/blog`;
const FEED = `${SITE}/blog/feed.xml`;
const IMAGE = `${SITE}/og.png`;
const TITLE = "Barter, reuse, and trust — the unscrewed.lol blog";
const DESCRIPTION =
  "Practical, evidence-conscious writing about direct barter, neighborhood reuse, marketplace trust, and building public-benefit exchange without transaction fees.";

export async function onRequest(context: {
  request: Request;
}): Promise<Response> {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const requestUrl = new URL(context.request.url);
  const [indexResponse, posts] = await Promise.all([
    fetch(`${requestUrl.origin}/index.html`),
    loadPosts(),
  ]);
  if (!indexResponse.ok) {
    return new Response("Site unavailable", { status: 503 });
  }

  let html = await indexResponse.text();
  html = replaceMeta(html, 'name="description"', DESCRIPTION).replace(
    '<link rel="canonical" href="https://unscrewed.lol/" />',
    `<link rel="canonical" href="${BLOG_URL}" />`
  );
  html = replaceMeta(html, 'property="og:url"', BLOG_URL);
  html = replaceMeta(html, 'property="og:type"', "website");
  html = replaceMeta(html, 'property="og:title"', TITLE);
  html = replaceMeta(html, 'property="og:description"', DESCRIPTION);
  html = replaceMeta(html, 'property="og:image"', IMAGE);
  html = replaceMeta(
    html,
    'property="og:image:alt"',
    "Your neighborhood already has what you need"
  );
  html = replaceMeta(html, 'name="twitter:title"', TITLE);
  html = replaceMeta(html, 'name="twitter:description"', DESCRIPTION);
  html = replaceMeta(html, 'name="twitter:image"', IMAGE);
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(TITLE)}</title>`
  );

  const blogPosts = posts.slice(0, 20).map((post) => ({
    "@type": "BlogPosting",
    headline: compact(post.title),
    url: `${SITE}/blog/${encodeURIComponent(post.slug)}`,
    ...(post.excerpt ? { description: compact(post.excerpt) } : {}),
    ...(post.datePublished
      ? { datePublished: new Date(post.datePublished).toISOString() }
      : {}),
    author: {
      "@type": "Person",
      name: compact(post.authorName ?? "") || "unscrewed team",
    },
  }));
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: TITLE,
    description: DESCRIPTION,
    url: BLOG_URL,
    inLanguage: "en-US",
    publisher: {
      "@type": "Organization",
      name: "unscrewed.lol",
      url: SITE,
    },
    blogPost: blogPosts,
  }).replaceAll("<", "\\u003c");

  html = html.replace(
    "</head>",
    `    <link rel="alternate" type="application/atom+xml" title="unscrewed.lol — Notes from the barter beat" href="${FEED}" />\n    <script type="application/ld+json">${structuredData}</script>\n  </head>`
  );

  return new Response(context.request.method === "HEAD" ? null : html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=900",
      "x-content-type-options": "nosniff",
    },
  });
}

async function loadPosts(): Promise<PublicPostSummary[]> {
  try {
    const response = await fetch(`${API}/blog`, {
      method: "GET",
      // @ts-expect-error Cloudflare-only fetch options
      cf: { cacheEverything: true, cacheTtl: 300 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as PublicPostList;
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    // Metadata should never make the readable blog unavailable.
    return [];
  }
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
