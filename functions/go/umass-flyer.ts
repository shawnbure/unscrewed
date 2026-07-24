const DESTINATION =
  "https://unscrewed.lol/umass?utm_source=umass_flyer&utm_medium=offline_qr&utm_campaign=umass_movein_fall_2026";

export function onRequest(context: { request: Request }): Response {
  if (context.request.method !== "GET" && context.request.method !== "HEAD")
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });

  return new Response(null, {
    status: 302,
    headers: {
      location: DESTINATION,
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
