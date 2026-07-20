// Pages Function: proxies the plain-text sitemap from the API origin.
// A text sitemap contains one absolute URL per line and avoids XML parsing.
export async function onRequest(context: { request: Request }): Promise<Response> {
  const isHead = context.request.method === "HEAD";
  const upstream = await fetch("https://api.unscrewed.lol/sitemap.txt", {
    method: "GET",
    // @ts-expect-error Cloudflare-only fetch options
    cf: { cacheEverything: true, cacheTtl: 900 },
  });
  const body = isHead ? null : await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=1800",
    },
  });
}
