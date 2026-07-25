interface FunctionContext {
  request: Request;
  next: () => Promise<Response>;
}

/**
 * Keep the SPA fallback from poisoning a newly deployed content-hashed asset
 * URL. During a brief Pages propagation race, a missing /assets/* file can
 * otherwise fall through to index.html and be cached for hours as JavaScript.
 */
export async function onRequest(
  context: FunctionContext
): Promise<Response> {
  const response = await context.next();
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("text/html")) {
    return new Response("Asset not available", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }
  return response;
}
