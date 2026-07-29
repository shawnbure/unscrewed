import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * BrowserRouter renders page content after the browser's native anchor pass.
 * Re-run that pass after React commits, and briefly follow layout changes from
 * async content above the target. Any user pointer/scroll gesture cancels the
 * follow-up so the page never fights intentional navigation.
 */
export function HashScroll() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    let active = true;
    const rawId = hash.slice(1);
    let id = rawId;
    try {
      id = decodeURIComponent(rawId);
    } catch {
      // A malformed escape should still get one literal getElementById pass.
    }

    const scrollToTarget = () => {
      if (!active) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    const stopFollowing = () => {
      active = false;
      observer?.disconnect();
    };

    const frame = window.requestAnimationFrame(scrollToTarget);
    const observedRoot = document.querySelector("main") ?? document.body;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scrollToTarget);
    observer?.observe(observedRoot);

    const timeout = window.setTimeout(() => observer?.disconnect(), 1_500);
    window.addEventListener("wheel", stopFollowing, { passive: true });
    window.addEventListener("touchstart", stopFollowing, { passive: true });
    window.addEventListener("pointerdown", stopFollowing, { passive: true });

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      observer?.disconnect();
      window.removeEventListener("wheel", stopFollowing);
      window.removeEventListener("touchstart", stopFollowing);
      window.removeEventListener("pointerdown", stopFollowing);
    };
  }, [pathname, search, hash]);

  return null;
}
