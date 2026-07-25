import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

interface ShareArticleProps {
  slug: string;
  title: string;
  excerpt?: string | null;
}

export function ShareArticle({ slug, title, excerpt }: ShareArticleProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const canonicalUrl = `https://unscrewed.lol/blog/${encodeURIComponent(slug)}`;
  const shareText = excerpt?.trim() || title;

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  function showCopied() {
    setCopied(true);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2500);
  }

  async function copyArticle() {
    const message = `${title}\n\n${shareText}\n\n${canonicalUrl}`;
    try {
      await navigator.clipboard.writeText(message);
      showCopied();
    } catch {
      window.prompt("Copy this guide and send it to someone who may use it:", message);
    }
  }

  async function shareArticle() {
    if (!navigator.share) {
      await copyArticle();
      return;
    }
    try {
      await navigator.share({
        title,
        text: shareText,
        url: canonicalUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyArticle();
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={shareArticle}
        className="btn-outline inline-flex items-center gap-2"
      >
        {copied ? (
          <Check className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <Share2 className="h-4 w-4" strokeWidth={2.25} />
        )}
        {copied ? "Guide link copied" : "Share this guide"}
      </button>
      <p className="mt-2 text-xs leading-relaxed text-ink-400">
        Sharing uses the canonical public article. Copying or opening a share
        sheet is not counted as a visit, signup, or community outcome.
      </p>
      <p className="sr-only" aria-live="polite">
        {copied ? "Article invitation copied to your clipboard." : ""}
      </p>
    </div>
  );
}
