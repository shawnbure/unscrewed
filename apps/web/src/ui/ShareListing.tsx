import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, Share2, X } from "lucide-react";
import { buildListingShareText } from "../lib/shareListing.js";

interface ShareListingProps {
  id: string;
  title: string;
  wants: string;
  postalCode?: string | null;
  exchangeMode?: "local" | "remote" | "either";
  owner?: boolean;
  variant?: "default" | "success";
}

export function ShareListing({
  id,
  title,
  wants,
  postalCode,
  exchangeMode = "local",
  owner = false,
  variant = "default",
}: ShareListingProps) {
  const [copied, setCopied] = useState(false);
  const [reviewing, setReviewing] = useState(false);
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
    exchangeMode,
    owner
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

  const buttonLabel = copied
    ? "Exact invitation copied"
    : owner
      ? "Review exact invitation"
      : variant === "success"
        ? "Invite a possible trade partner"
        : "Share this trade";

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
        onClick={owner ? () => setReviewing(true) : shareListing}
        aria-expanded={owner ? reviewing : undefined}
        className={
          variant === "default"
            ? "btn-outline mt-2 flex w-full items-center justify-center gap-2"
            : "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30 sm:w-auto"
        }
      >
        {copied ? (
          <Check className="h-4 w-4" strokeWidth={2.25} />
        ) : owner ? (
          <Eye className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <Share2 className="h-4 w-4" strokeWidth={2.25} />
        )}
        {buttonLabel}
      </button>
      {owner && reviewing && (
        <section
          className={`mt-3 rounded-2xl border p-4 text-left ${
            variant === "success"
              ? "border-white/20 bg-white text-ink-900 shadow-card sm:w-[28rem]"
              : "border-surface-200 bg-surface-50"
          }`}
          aria-labelledby={`share-review-${id}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                id={`share-review-${id}`}
                className="text-sm font-bold text-ink-900"
              >
                Review the exact invitation
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Choose one person who might genuinely want this offer. Nothing
                is sent until you choose the recipient and send it yourself.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="rounded-lg p-1 text-ink-400 hover:bg-surface-100 hover:text-ink-700"
              aria-label="Close invitation review"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-surface-200 bg-white p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
              {shareText}
            </p>
            <p className="mt-2 break-all text-[11px] leading-relaxed text-brand-700">
              {shareUrl}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={shareListing}
              className="btn-brand text-sm"
            >
              <Share2 className="h-4 w-4" strokeWidth={2.25} />
              Choose a recipient
            </button>
            <button
              type="button"
              onClick={copyShare}
              className="btn-outline text-sm"
            >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={2.25} />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={2.25} />
              )}
              {copied ? "Exact invitation copied" : "Copy exact invitation"}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
            Copying prepares the invitation but does not send it or count as a
            visit. Only a recipient opening the link creates an invitation
            visit.
          </p>
        </section>
      )}
      <p className="sr-only" aria-live="polite">
        {copied ? "Exact trade invitation copied to your clipboard." : ""}
      </p>
    </div>
  );
}
