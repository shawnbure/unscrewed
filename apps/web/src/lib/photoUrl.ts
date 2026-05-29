// R2 keys are served by the API Worker at /listings/photos/:key
// Use the same routing logic as api.ts so we always hit the live host on prod.

const API_HOST = (() => {
  if (typeof window === "undefined") return "";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "/api";
  return "https://api.unscrewed.lol";
})();

export function photoUrl(key: string): string {
  return `${API_HOST}/listings/photos/${encodeURIComponent(key)}`;
}
