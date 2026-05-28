// Thin API client. All requests go through Vite's /api proxy in dev and
// through api.unscrewed.lol in prod.

const BASE =
  import.meta.env.VITE_API_BASE ??
  (typeof window !== "undefined" && window.location.hostname === "unscrewed.lol"
    ? "https://api.unscrewed.lol"
    : "/api");

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw Object.assign(new Error(json?.error ?? `HTTP ${res.status}`), {
      status: res.status,
      body: json,
    });
  }
  return json as T;
}
