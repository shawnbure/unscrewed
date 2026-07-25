const SITE = "https://unscrewed.lol";
const HOST = "unscrewed.lol";
const KEY = "9407c4d3bcc343a8c234381a38c8ad3e";
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

/**
 * Notify participating search engines about a newly published, updated, or
 * removed public URL. The key is intentionally public: IndexNow verifies
 * ownership by fetching the matching file from this site's root.
 */
export async function notifyIndexNow(paths: string[]): Promise<void> {
  const urlList = [
    ...new Set(
      paths
        .filter((path) => path.startsWith("/") && !path.startsWith("//"))
        .map((path) => `${SITE}${path}`)
    ),
  ].slice(0, 100);
  if (urlList.length === 0) return;

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });
  if (!response.ok) {
    throw new Error(`IndexNow submission failed with HTTP ${response.status}`);
  }
}
