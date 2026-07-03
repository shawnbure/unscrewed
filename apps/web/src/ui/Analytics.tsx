// Cookieless analytics beacon for unscrewed.lol.
//
// We use Cloudflare Web Analytics: privacy-first, no cookies, no consent
// banner needed, no personal data collected. Only fires when a beacon
// token is present, so dev and preview builds stay silent.
//
// Two ways to activate:
//   1. Cloudflare Pages dashboard → unscrewed-web → Settings → Web
//      Analytics → toggle ON. Cloudflare injects the script at the edge
//      automatically; no env var needed.
//   2. Set VITE_CF_BEACON_TOKEN in Pages Production/Preview env vars.
//      This component injects the same beacon at runtime.
//
// Either path is fine. #1 is the recommended one because it doesn't
// require code changes to swap tokens.

import { useEffect } from "react";

const BEACON_URL = "https://static.cloudflareinsights.com/beacon.min.js";

export function Analytics() {
  useEffect(() => {
    const token = import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined;
    if (!token) return;
    // Avoid double-injection during HMR / StrictMode remounts.
    if (document.querySelector(`script[data-cf-beacon-token="${token}"]`))
      return;
    const s = document.createElement("script");
    s.defer = true;
    s.src = BEACON_URL;
    s.dataset.cfBeacon = JSON.stringify({ token });
    // Custom marker attribute for the dedup check above.
    s.dataset.cfBeaconToken = token;
    document.head.appendChild(s);
    return () => {
      // Keep the beacon around across route changes; only remove on full
      // unmount of the app root (which normally means the tab is closing).
    };
  }, []);
  return null;
}
