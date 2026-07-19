// Pages Function: proxies /sitemap.xml → api.unscrewed.lol/sitemap.xml.
// Necessary because Pages _redirects can't reverse-proxy to external
// origins with status 200 — the SPA catch-all wins and serves HTML,
// which Googlebot then rejects as "sitemap is HTML".

// Handle GET *and* HEAD — Google (and other crawlers) HEAD-first to check
// content-type; without HEAD, the SPA static router returns index.html and
// crawlers think the sitemap is HTML and abort.
export async function onRequest(context: { request: Request }): Promise<Response> {
  const isHead = context.request.method === "HEAD";
  const upstream = await fetch("https://api.unscrewed.lol/sitemap.xml", {
    method: "GET",
    // @ts-expect-error Cloudflare-only fetch options
    cf: { cacheEverything: true, cacheTtl: 900 },
  });
  const body = isHead ? null : await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=1800",
    },
  });
}
