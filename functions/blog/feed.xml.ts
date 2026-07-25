export async function onRequest(context: {
  request: Request;
}): Promise<Response> {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const upstream = await fetch("https://api.unscrewed.lol/blog/feed.xml", {
    method: "GET",
    // @ts-expect-error Cloudflare-only fetch options
    cf: { cacheEverything: true, cacheTtl: 900 },
  });
  const body =
    context.request.method === "HEAD" ? null : await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=1800",
      "x-content-type-options": "nosniff",
    },
  });
}
