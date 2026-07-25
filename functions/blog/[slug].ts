interface PublicPost {
  slug: string;
  title: string;
  excerpt?: string | null;
  datePublished?: number | null;
  dateModified?: number | null;
  authorName?: string | null;
}

interface FunctionContext {
  request: Request;
  params: { slug?: string | string[] };
}

const SITE = "https://unscrewed.lol";
const API = "https://api.unscrewed.lol";
const IMAGE = `${SITE}/og.png`;

export async function onRequest(context: FunctionContext): Promise<Response> {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawSlug = context.params.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  if (!slug) return notFound();

  const postResponse = await fetch(
    `${API}/blog/${encodeURIComponent(slug)}`,
    {
      method: "GET",
      // @ts-expect-error Cloudflare-only fetch options
      cf: { cacheEverything: true, cacheTtl: 300 },
    }
  );
  if (!postResponse.ok) {
    return postResponse.status === 404
      ? notFound()
      : new Response("Site unavailable", { status: 503 });
  }

  const post = (await postResponse.json()) as PublicPost;
  const canonical = `${SITE}/blog/${encodeURIComponent(post.slug)}`;
  const title = truncate(`${compact(post.title)} | unscrewed.lol`, 90);
  const description = truncate(
    compact(post.excerpt ?? "") ||
      "Practical notes about barter, community reuse, trust, and building a marketplace that takes no cut.",
    160
  );

  const requestUrl = new URL(context.request.url);
  const indexResponse = await fetch(`${requestUrl.origin}/index.html`);
  if (!indexResponse.ok) {
    return new Response("Site unavailable", { status: 503 });
  }

  let html = await indexResponse.text();
  html = replaceMeta(html, 'name="description"', description).replace(
    '<link rel="canonical" href="https://unscrewed.lol/" />',
    `<link rel="canonical" href="${canonical}" />`
  );
  html = replaceMeta(html, 'property="og:url"', canonical);
  html = replaceMeta(html, 'property="og:type"', "article");
  html = replaceMeta(html, 'property="og:title"', title);
  html = replaceMeta(html, 'property="og:description"', description);
  html = replaceMeta(html, 'property="og:image"', IMAGE);
  html = replaceMeta(
    html,
    'property="og:image:alt"',
    "Neighbors exchanging useful goods and skills through unscrewed.lol"
  );
  html = replaceMeta(html, 'name="twitter:title"', title);
  html = replaceMeta(html, 'name="twitter:description"', description);
  html = replaceMeta(html, 'name="twitter:image"', IMAGE);
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`
  );
  const datePublished = new Date(
    post.datePublished ?? post.dateModified ?? Date.now()
  ).toISOString();
  const dateModified = new Date(
    post.dateModified ?? post.datePublished ?? Date.now()
  ).toISOString();
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: compact(post.title),
    description,
    url: canonical,
    mainEntityOfPage: canonical,
    image: IMAGE,
    datePublished,
    dateModified,
    author: {
      "@type": "Person",
      name: compact(post.authorName ?? "") || "unscrewed team",
    },
    publisher: {
      "@type": "Organization",
      name: "unscrewed.lol",
      url: SITE,
    },
  }).replaceAll("<", "\\u003c");
  html = html.replace(
    "</head>",
    `    <meta property="article:published_time" content="${datePublished}" />\n    <meta property="article:modified_time" content="${dateModified}" />\n    <script type="application/ld+json">${structuredData}</script>\n  </head>`
  );

  return new Response(context.request.method === "HEAD" ? null : html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff",
    },
  });
}

function notFound(): Response {
  return new Response("Post not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex",
    },
  });
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
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
