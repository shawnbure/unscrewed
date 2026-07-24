import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

const SHARE_URL =
  "https://unscrewed.lol/?utm_source=completed_trade_share&utm_medium=share&utm_campaign=real_trade_invite";
const SHARE_TEXT =
  "We completed a real barter on unscrewed.lol—agreed by both people, with no listing fee or transaction fee. See what your neighbors could trade.";

export function ShareCompletedTrade() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  async function copyInvite() {
    const message = `${SHARE_TEXT} ${SHARE_URL}`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this invitation and send it to a neighbor:", message);
    }
  }

  async function shareTrade() {
    if (!navigator.share) {
      await copyInvite();
      return;
    }

    try {
      await navigator.share({
        title: "A real barter, completed without platform fees",
        text: SHARE_TEXT,
        url: SHARE_URL,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyInvite();
    }
  }

  return (
    <div className="mt-3 border-t border-brand-200 pt-3">
      <button
        type="button"
        onClick={shareTrade}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
      >
        {copied ? (
          <Check className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <Share2 className="h-4 w-4" strokeWidth={2.25} />
        )}
        {copied ? "Neighbor invite copied" : "Share the real milestone"}
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-brand-700">
        The invitation includes no names, terms, meetup details, or private
        conversation. Recipient visits are measured; opening this button is
        not counted as growth.
      </p>
      <p className="sr-only" aria-live="polite">
        {copied ? "Completed-trade invitation copied to your clipboard." : ""}
      </p>
    </div>
  );
}
