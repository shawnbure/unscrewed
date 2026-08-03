const DESTINATION =
  "https://unscrewed.lol/contact?intent=organizer-pilot&utm_source=organizer_field_sheet&utm_medium=offline_qr&utm_campaign=start_a_barter_circle_2026";

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
