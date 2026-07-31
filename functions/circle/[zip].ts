const META_DESCRIPTION =
  "Help start a free local barter circle by posting one real item or skill, inviting one plausible trading partner, and confirming a fair exchange.";

export async function onRequest(context: {
  request: Request;
}): Promise<Response> {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const requestUrl = new URL(context.request.url);
  const zip = requestUrl.pathname.split("/").filter(Boolean)[1] ?? "";
  if (!/^\d{5}$/.test(zip)) {
    return Response.redirect(`${requestUrl.origin}/movement#start`, 302);
  }

  const canonicalUrl = `https://unscrewed.lol/circle/${zip}`;
  const title = `Help start a barter circle around ZIP ${zip} — unscrewed.lol`;
  const indexResponse = await fetch(`${requestUrl.origin}/index.html`);
  if (!indexResponse.ok) {
    return new Response("Site unavailable", { status: 503 });
  }

  let html = await indexResponse.text();
  html = replaceMeta(html, 'name="description"', META_DESCRIPTION).replace(
    '<link rel="canonical" href="https://unscrewed.lol/" />',
    `<link rel="canonical" href="${canonicalUrl}" />`
  );
  html = replaceMeta(html, 'property="og:url"', canonicalUrl);
  html = replaceMeta(html, 'property="og:title"', title);
  html = replaceMeta(html, 'property="og:description"', META_DESCRIPTION);
  html = replaceMeta(
    html,
    'property="og:image"',
    "https://unscrewed.lol/movement-og.png"
  );
  html = replaceMeta(
    html,
    'property="og:image:alt"',
    `Help start a barter circle around ZIP ${zip}`
  );
  html = replaceMeta(html, 'name="twitter:title"', title);
  html = replaceMeta(html, 'name="twitter:description"', META_DESCRIPTION);
  html = replaceMeta(
    html,
    'name="twitter:image"',
    "https://unscrewed.lol/movement-og.png"
  );
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${title}</title>`
  );
  html = html.replace(
    "</head>",
    '    <meta name="robots" content="noindex, follow" />\n  </head>'
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
