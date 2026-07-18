// Pages Function: proxies /sitemap.xml → api.unscrewed.lol/sitemap.xml.
// Necessary because Pages _redirects can't reverse-proxy to external
// origins with status 200 — the SPA catch-all wins and serves HTML,
// which Googlebot then rejects as "sitemap is HTML".

export async function onRequestGet(): Promise<Response> {
  const upstream = await fetch("https://api.unscrewed.lol/sitemap.xml", {
    // @ts-expect-error Cloudflare-only fetch options
    cf: { cacheEverything: true, cacheTtl: 900 },
  });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=1800",
    },
  });
}
