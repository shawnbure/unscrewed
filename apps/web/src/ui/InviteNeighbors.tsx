import { useEffect, useRef, useState } from "react";
import {
  BadgeDollarSign,
  Check,
  Copy,
  HeartHandshake,
  Share2,
  ShieldCheck,
} from "lucide-react";

const GENERAL_INVITE = {
  url: "https://unscrewed.lol/movement?utm_source=movement_share&utm_medium=share&utm_campaign=national_barter_movement_2026",
  title: "Help start the barter movement",
  text: "Anyone in the United States can start a local barter circle. Post one useful thing or skill, invite one plausible trading partner, and keep value in your community—no fees and no corporate skim.",
  eyebrow: "A nationwide movement, built locally",
  heading: "Help make barter normal again.",
  body: "The movement can spread across the country one useful local exchange at a time. Post something real, invite one person who could genuinely trade with you, and give the next community a pattern it can copy.",
  shareLabel: "Share the movement",
  copyLabel: "Copy movement invite",
  copiedHint: "Ready to paste into a text, group chat, or community forum.",
  idleHint:
    "No referral contest or promotional blast. One relevant invitation is enough.",
};

const UMASS_INVITE = {
  url: "https://unscrewed.lol/umass?utm_source=umass_neighbor_invite&utm_medium=share&utm_campaign=umass_movein_fall_2026",
  title: "Invite someone near UMass to trade",
  text: "Help start a free UMass Amherst-area barter pool for dorm gear, textbooks, and skills. No listing fees or transaction fees.",
  eyebrow: "Build the first local pool",
  heading: "Know one person around UMass? Invite them in.",
  body: "A first listing needs a nearby counterparty. Invite a roommate, classmate, coworker, or neighbor who has one useful thing or skill they would genuinely trade.",
  shareLabel: "Invite someone near UMass",
  copyLabel: "Copy UMass invite",
  copiedHint: "Ready to paste into a text, campus group chat, or club channel.",
  idleHint:
    "The link returns them to this UMass-area pilot and helps measure whether local invitations work.",
};

interface InviteNeighborsProps {
  audience?: "general" | "umass";
  localArea?: {
    zip: string;
    browsePath: string;
  };
}

export function InviteNeighbors({
  audience = "general",
  localArea,
}: InviteNeighborsProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const invite =
    audience === "umass"
      ? UMASS_INVITE
      : localArea
        ? localInvite(localArea)
        : GENERAL_INVITE;

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${invite.text} ${invite.url}`);
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(
        "Copy this invitation:",
        `${invite.text} ${invite.url}`
      );
    }
  }

  async function shareInvite() {
    if (!navigator.share) {
      await copyInvite();
      return;
    }

    try {
      await navigator.share({
        title: invite.title,
        text: invite.text,
        url: invite.url,
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
            {invite.eyebrow}
          </p>
          <h2 className="display mt-2 max-w-2xl text-balance text-3xl sm:text-4xl">
            {invite.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
            {invite.body}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={shareInvite}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              <Share2 className="h-4 w-4" strokeWidth={2.25} />
              {invite.shareLabel}
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
              {copied ? "Invite copied" : invite.copyLabel}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/55" aria-live="polite">
            {copied ? invite.copiedHint : invite.idleHint}
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
            title="National reach, local value"
            body="Anyone in the U.S. can start; each exchange strengthens the community that made it."
          />
        </div>
      </div>
    </section>
  );
}

function localInvite(area: NonNullable<InviteNeighborsProps["localArea"]>) {
  const url = new URL(area.browsePath, window.location.origin);
  url.searchParams.set("utm_source", "neighbor_invite");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", `invite_your_block:${area.zip}`);

  return {
    url: url.toString(),
    title: `See trades around ZIP ${area.zip} on unscrewed.lol`,
    text: `See real barter offers around ZIP ${area.zip}, or post one useful thing or skill your neighbors can trade for. No fees and no corporate skim.`,
    eyebrow: "Your local trade area",
    heading: `Invite one neighbor around ZIP ${area.zip}.`,
    body: `This invitation opens the live ${HOME_AREA_LABEL} around ZIP ${area.zip}, so your neighbor sees relevant inventory instead of a national feed. One plausible invitation is more useful than a promotional blast.`,
    shareLabel: "Share local trades",
    copyLabel: "Copy local invite",
    copiedHint: `Ready to send. The link identifies the ZIP ${area.zip} trade area, not your exact address.`,
    idleHint: `Share only with someone you want to invite into the ZIP ${area.zip} trade area. Nothing is sent until you choose a recipient.`,
  };
}

const HOME_AREA_LABEL = "25 km trade area";

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
