import { useRef, useState } from "react";
import {
  BadgeDollarSign,
  Check,
  Copy,
  HeartHandshake,
  Share2,
  ShieldCheck,
} from "lucide-react";

const INVITE_URL =
  "https://unscrewed.lol/?utm_source=neighbor_invite&utm_medium=share&utm_campaign=invite_your_block";
const INVITE_TEXT =
  "Your neighborhood already has what you need. Trade goods and skills with nearby people—no fees and no corporate skim.";

export function InviteNeighbors() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${INVITE_TEXT} ${INVITE_URL}`);
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this invitation and send it to a neighbor:", `${INVITE_TEXT} ${INVITE_URL}`);
    }
  }

  async function shareInvite() {
    if (!navigator.share) {
      await copyInvite();
      return;
    }

    try {
      await navigator.share({
        title: "Invite your block to unscrewed.lol",
        text: INVITE_TEXT,
        url: INVITE_URL,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyInvite();
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-brand-800 text-white shadow-card">
      <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:p-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
            Public benefit, by design
          </p>
          <h2 className="display mt-2 max-w-2xl text-balance text-3xl sm:text-4xl">
            Invite your block. Make barter useful where you live.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
            A barter network becomes valuable when nearby people join it. One
            invitation can turn idle stuff and overlooked skills into a local
            safety net—while keeping value in the community that created it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={shareInvite}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              <Share2 className="h-4 w-4" strokeWidth={2.25} />
              Share with a neighbor
            </button>
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
            >
              {copied ? (
                <Check className="h-4 w-4" strokeWidth={2.25} />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={2.25} />
              )}
              {copied ? "Invite copied" : "Copy invite"}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/55" aria-live="polite">
            {copied
              ? "Ready to paste into a text, group chat, or neighborhood forum."
              : "No referral contest. Just a useful invitation from one neighbor to another."}
          </p>
        </div>

        <div className="grid gap-3" aria-label="Our public-benefit commitments">
          <Commitment
            icon={<BadgeDollarSign className="h-5 w-5" strokeWidth={2} />}
            title="Core barter stays free"
            body="Browse, post, negotiate, and sign a trade without a platform fee."
          />
          <Commitment
            icon={<ShieldCheck className="h-5 w-5" strokeWidth={2} />}
            title="No transaction skim"
            body="What neighbors exchange stays between neighbors."
          />
          <Commitment
            icon={<HeartHandshake className="h-5 w-5" strokeWidth={2} />}
            title="Local value stays local"
            body="Growth should strengthen communities, not extract from them."
          />
        </div>
      </div>
    </section>
  );
}

function Commitment({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-300/15 text-brand-200">
          {icon}
        </span>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/65">{body}</p>
        </div>
      </div>
    </div>
  );
}
