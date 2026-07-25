const META = {
  title: "Start the barter movement across America — unscrewed.lol",
  description:
    "Anyone in the United States can start a local barter circle: post one useful thing or skill, invite one plausible trading partner, and keep value in the community.",
  url: "https://unscrewed.lol/movement",
};

export async function onRequest(context: {
  request: Request;
}): Promise<Response> {
  if (context.request.method !== "GET" && context.request.method !== "HEAD")
    return new Response("Method not allowed", { status: 405 });

  const requestUrl = new URL(context.request.url);
  const indexResponse = await fetch(`${requestUrl.origin}/index.html`);
  if (!indexResponse.ok)
    return new Response("Site unavailable", { status: 503 });

  let html = await indexResponse.text();
  html = replaceMeta(html, 'name="description"', META.description).replace(
    '<link rel="canonical" href="https://unscrewed.lol/" />',
    `<link rel="canonical" href="${META.url}" />`
  );
  html = replaceMeta(html, 'property="og:url"', META.url);
  html = replaceMeta(html, 'property="og:title"', META.title);
  html = replaceMeta(html, 'property="og:description"', META.description);
  html = replaceMeta(html, 'name="twitter:title"', META.title);
  html = replaceMeta(html, 'name="twitter:description"', META.description);
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${META.title}</title>`
  );

  return new Response(context.request.method === "HEAD" ? null : html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=900",
      "x-content-type-options": "nosniff",
    },
  });
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
