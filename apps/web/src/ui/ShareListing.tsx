import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

interface ShareListingProps {
  id: string;
  title: string;
  wants: string;
}

export function ShareListing({ id, title, wants }: ShareListingProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const shareUrl = `${window.location.origin}/listing/${encodeURIComponent(id)}?utm_source=listing_share&utm_medium=share&utm_campaign=share_a_trade`;
  const shareText = buildShareText(title, wants);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  async function copyShare() {
    const message = `${shareText} ${shareUrl}`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this trade and send it to a neighbor:", message);
    }
  }

  async function shareListing() {
    if (!navigator.share) {
      await copyShare();
      return;
    }

    try {
      await navigator.share({
        title: `${title} — barter on unscrewed.lol`,
        text: shareText,
        url: shareUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyShare();
    }
  }

  return (
    <div className="mt-5 border-t border-surface-200 pt-4">
      <p className="text-center text-xs text-ink-500">
        Help this trade find the right nearby person.
      </p>
      <button
        type="button"
        onClick={shareListing}
        className="btn-outline mt-2 flex w-full items-center justify-center gap-2"
      >
        {copied ? (
          <Check className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <Share2 className="h-4 w-4" strokeWidth={2.25} />
        )}
        {copied ? "Trade link copied" : "Share this trade"}
      </button>
      <p className="sr-only" aria-live="polite">
        {copied ? "Trade invitation copied to your clipboard." : ""}
      </p>
    </div>
  );
}

function buildShareText(title: string, wants: string): string {
  const compactWants = wants.replace(/\s+/g, " ").trim();
  const shortenedWants =
    compactWants.length > 140
      ? `${compactWants.slice(0, 137).trimEnd()}…`
      : compactWants;
  return `${title} is up for barter. Looking for: ${shortenedWants}. No listing or transaction fees.`;
}
