// Reusable modal that shows the unscrewed.lol philosophy / manifesto.
// Used from the Home hero and the footer. Single source of copy — if the
// philosophy is ever revised, update PHILOSOPHY_PARAGRAPHS below and the
// ToS preamble in pages/Tos.tsx in parallel.

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PHILOSOPHY_PARAGRAPHS = [
  "Somewhere along the way, we forgot how to live with each other. We turned neighbors into strangers, skills into subscriptions, and time itself into something we rent back from people who produce nothing. We pay for the privilege of working, and we work to afford the things that were meant to make work bearable.",
  "That isn't an economy. That's a cage with a screen in it. A system designed to convince you that what's natural — helping a neighbor, fixing your own car, growing your own food, trading with someone you actually know — is somehow inefficient, backward, or quaint. Meanwhile the people who own the cage post record profits.",
  "unscrewed.lol exists to wake people up, gently, by giving them a place to remember that another way is possible. That a haircut can pay for a tune-up. That a guitar lesson can pay for a tomato harvest. That your time, your skills, and the things sitting in your garage are worth something to someone within walking distance — and that exchange between humans does not require a corporation, a payment processor, or a permission slip from an algorithm.",
  "We believe community is not something the government delivers or a brand sponsors. It's something we build with our own hands, one trade at a time. We believe the dollar is a tool, not a master. We believe the people who run things will not save us — and we can save each other.",
  "If you're reading this, you already feel it. The whole system has been quietly draining your time, your money, your trust, and your hope. You're not crazy. You're awake. Welcome.",
];

export function PhilosophyModal({ open, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/60 p-3 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="philosophy-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card relative max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 text-ink-500 hover:bg-surface-100"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
          Our philosophy
        </p>
        <h2
          id="philosophy-title"
          className="display mt-2 text-balance text-3xl text-ink-900 sm:text-4xl"
        >
          We weren't meant to live like this.
        </h2>
        <div className="prose prose-neutral mt-5 max-w-none text-ink-700">
          {PHILOSOPHY_PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 pt-4 text-xs text-ink-500">
          <span>
            This is also the preamble to our{" "}
            <Link
              to="/tos"
              onClick={onClose}
              className="underline hover:text-ink-900"
            >
              Terms of Service
            </Link>
            .
          </span>
          <button type="button" onClick={onClose} className="btn-primary">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
