// Thin API client. All requests go through Vite's /api proxy in dev and
// through api.unscrewed.lol in prod.

// Pick API base from build-time env if set; otherwise pick by host:
//   - localhost / 127.0.0.1            → Vite proxy
//   - dev.unscrewed.lol / preview pages → api-dev.unscrewed.lol (staging)
//   - unscrewed.lol / www / pages prod  → api.unscrewed.lol (production)
export const API_BASE = (() => {
  const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return "/api";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "/api";
  if (host === "dev.unscrewed.lol" || host.endsWith(".unscrewed-web.pages.dev"))
    return "https://api-dev.unscrewed.lol";
  return "https://api.unscrewed.lol";
})();
const BASE = API_BASE;

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
