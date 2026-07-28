const META = {
  title: "Start the barter movement across America — unscrewed.lol",
  description:
    "Anyone in the United States can start a local barter circle: post one useful thing or skill, invite one plausible trading partner, and keep value in the community.",
  url: "https://unscrewed.lol/movement",
  image: "https://unscrewed.lol/movement-og.png",
  imageAlt:
    "Start the barter movement: people across the United States exchanging useful goods and skills",
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to start a free local barter circle",
  description:
    "Start a neighbor-to-neighbor barter circle anywhere in the United States without listing fees or transaction fees.",
  totalTime: "PT15M",
  supply: [
    {
      "@type": "HowToSupply",
      name: "One useful item, service, or skill you can genuinely provide",
    },
  ],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Post one real offer",
      text: "Choose a specific good, service, or skill you can genuinely provide.",
      url: "https://unscrewed.lol/movement#start",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Invite one plausible trading partner",
      text: "Share the exact offer with one person who might genuinely want it and have something fair to trade.",
      url: "https://unscrewed.lol/movement",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Complete and confirm a fair trade",
      text: "Agree clearly, exchange safely, and have both participants separately confirm the real exchange happened.",
      url: "https://unscrewed.lol/safety",
    },
  ],
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
  html = replaceMeta(html, 'property="og:image"', META.image);
  html = replaceMeta(html, 'property="og:image:alt"', META.imageAlt);
  html = replaceMeta(html, 'name="twitter:title"', META.title);
  html = replaceMeta(html, 'name="twitter:description"', META.description);
  html = replaceMeta(html, 'name="twitter:image"', META.image);
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${META.title}</title>`
  );
  html = html.replace(
    "</head>",
    `    <script type="application/ld+json">${JSON.stringify(STRUCTURED_DATA).replaceAll("<", "\\u003c")}</script>\n  </head>`
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
