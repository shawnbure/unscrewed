import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, MapPin, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { listingStarterPath } from "../lib/listingStarters.js";

const ZIP_PATTERN = /^\d{5}$/;

export function buildCircleInvite(zip: string, origin = window.location.origin) {
  if (!ZIP_PATTERN.test(zip)) return null;

  const url = new URL(`/circle/${zip}`, origin);
  url.searchParams.set("utm_source", "circle_invite");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", `start_a_circle:${zip}`);

  return {
    url: url.toString(),
    title: `Help start a barter circle around ZIP ${zip}`,
    text: `Help start a free barter circle around ZIP ${zip}. Post one useful item or skill, invite one plausible trading partner, and keep local value in local hands—no listing fees or transaction fees.`,
  };
}

export function StartCircleInvite({ initialZip = "" }: { initialZip?: string }) {
  const normalizedInitialZip = ZIP_PATTERN.test(initialZip) ? initialZip : "";
  const [zip, setZip] = useState(normalizedInitialZip);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const invite = useMemo(() => buildCircleInvite(zip), [zip]);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  async function copyInvite() {
    if (!invite) return;
    const message = `${invite.text} ${invite.url}`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this local-circle invitation:", message);
    }
  }

  async function shareInvite() {
    if (!invite) return;
    if (!navigator.share) {
      await copyInvite();
      return;
    }

    try {
      await navigator.share(invite);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyInvite();
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-surface-200 bg-white shadow-card">
      <div className="grid gap-7 p-7 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <MapPin className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-brand-700">
            Launch anywhere in America
          </p>
          <h2 className="display mt-2 text-balance text-3xl text-ink-900 sm:text-4xl">
            Give your ZIP a circle it can join.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Enter a ZIP to make a truthful local launch link. It invites people
            to create the first supply; it never claims your area already has
            members, listings, or completed trades.
          </p>
        </div>

        <div className="rounded-2xl border border-surface-200 bg-surface-50 p-5 sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold text-ink-900">
              U.S. ZIP code
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={zip}
                onChange={(event) => {
                  setZip(
                    event.target.value.replace(/\D/g, "").slice(0, 5)
                  );
                  setCopied(false);
                }}
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="\d{5}"
                maxLength={5}
                placeholder="85224"
                className="input min-w-0 flex-1"
                aria-describedby="circle-zip-help"
              />
              <button
                type="button"
                onClick={shareInvite}
                disabled={!invite}
                className="btn-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" strokeWidth={2.25} />
                Share this circle
              </button>
            </div>
          </label>
          <p id="circle-zip-help" className="mt-2 text-xs text-ink-400">
            The ZIP appears in the invitation. No street address or exact
            location is collected here.
          </p>

          {invite ? (
            <>
              <div className="mt-4 rounded-xl border border-surface-200 bg-white p-4">
                <p className="text-sm leading-relaxed text-ink-800">
                  {invite.text}
                </p>
                <p className="mt-2 break-all text-[11px] leading-relaxed text-brand-700">
                  {invite.url}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyInvite}
                  className="btn-outline text-sm"
                >
                  {copied ? (
                    <Check className="h-4 w-4" strokeWidth={2.25} />
                  ) : (
                    <Copy className="h-4 w-4" strokeWidth={2.25} />
                  )}
                  {copied ? "Local invitation copied" : "Copy exact invitation"}
                </button>
                <Link
                  to={listingStarterPath("useful_item", zip)}
                  className="btn-outline text-sm"
                >
                  Post the first item
                </Link>
                <Link
                  to={listingStarterPath("one_hour_help", zip)}
                  className="btn-outline text-sm"
                >
                  Post the first skill
                </Link>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
                Nothing is sent automatically. Recipient visits use this ZIP
                campaign so local-circle invitations can be measured without
                identifying the recipient.
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-surface-300 bg-white px-4 py-5 text-sm text-ink-500">
              Enter five digits to generate the exact local invitation and the
              path to its first real offer.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
