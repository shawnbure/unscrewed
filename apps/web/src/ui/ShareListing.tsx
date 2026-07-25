import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { buildListingShareText } from "../lib/shareListing.js";

interface ShareListingProps {
  id: string;
  title: string;
  wants: string;
  postalCode?: string | null;
  exchangeMode?: "local" | "remote" | "either";
  variant?: "default" | "success";
}

export function ShareListing({
  id,
  title,
  wants,
  postalCode,
  exchangeMode = "local",
  variant = "default",
}: ShareListingProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const shareParams = new URLSearchParams({
    utm_source: "listing_share",
    utm_medium: "share",
    utm_campaign: `share_a_trade:${id}`,
  });
  const shareUrl = `${window.location.origin}/listing/${encodeURIComponent(id)}?${shareParams.toString()}`;
  const shareText = buildListingShareText(
    title,
    wants,
    postalCode,
    exchangeMode
  );

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
      window.prompt(
        "Copy this trade and send it to one possible trade partner:",
        message
      );
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
    <div
      className={
        variant === "default"
          ? "mt-5 border-t border-surface-200 pt-4"
          : "mt-4"
      }
    >
      {variant === "default" && (
        <p className="text-center text-xs text-ink-500">
          {exchangeMode === "remote"
            ? "Help this trade find one relevant person anywhere in the U.S."
            : exchangeMode === "either"
              ? "Help this trade find one relevant local or remote partner."
              : "Help this trade find the right nearby person."}
        </p>
      )}
      <button
        type="button"
        onClick={shareListing}
        className={
          variant === "default"
            ? "btn-outline mt-2 flex w-full items-center justify-center gap-2"
            : "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:w-auto"
        }
      >
        {copied ? (
          <Check className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <Share2 className="h-4 w-4" strokeWidth={2.25} />
        )}
        {copied
          ? "Trade link copied"
          : variant === "success"
            ? "Invite a possible trade partner"
            : "Share this trade"}
      </button>
      <p className="sr-only" aria-live="polite">
        {copied ? "Trade invitation copied to your clipboard." : ""}
      </p>
    </div>
  );
}
