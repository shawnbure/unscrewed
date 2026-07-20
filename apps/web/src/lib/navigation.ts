export function safeNextPath(
  searchParams: URLSearchParams,
  fallback = "/browse"
): string {
  const next = searchParams.get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(next, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function withNext(path: string, next: string): string {
  const params = new URLSearchParams({ next });
  return `${path}?${params.toString()}`;
}
