import { useEffect, useState } from "react";
import { ArrowRight, Loader2, MapPin, ShieldCheck, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { listingStarterPath } from "../lib/listingStarters.js";
import { Container } from "../ui/Container.js";
import { ListingCard, type ListingCardData } from "../ui/ListingCard.js";
import { StartCircleInvite } from "../ui/StartCircleInvite.js";

const ZIP_PATTERN = /^\d{5}$/;

export default function CirclePage() {
  const { zip = "" } = useParams();
  const [inventory, setInventory] = useState<ListingCardData[] | null>(null);
  const [inventoryUnavailable, setInventoryUnavailable] = useState(false);

  useEffect(() => {
    if (!ZIP_PATTERN.test(zip)) return;
    let current = true;
    setInventory(null);
    setInventoryUnavailable(false);
    const query = new URLSearchParams({
      postalCode: zip,
      exchangeMode: "local",
      limit: "12",
    });
    api<{ items: ListingCardData[] }>(`/listings?${query.toString()}`)
      .then((response) => {
        if (current) setInventory(response.items);
      })
      .catch(() => {
        if (current) setInventoryUnavailable(true);
      });
    return () => {
      current = false;
    };
  }, [zip]);

  if (!ZIP_PATTERN.test(zip)) {
    return (
      <Container size="sm" className="py-16 text-center">
        <MapPin className="mx-auto h-9 w-9 text-brand-600" />
        <h1 className="display mt-4 text-3xl text-ink-900">
          This circle needs a five-digit ZIP.
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          Generate a truthful local-circle invitation from the nationwide
          movement page.
        </p>
        <Link to="/movement#start" className="btn-brand mt-6">
          Choose a ZIP
        </Link>
      </Container>
    );
  }

  const hasInventory = (inventory?.length ?? 0) > 0;
  const confirmedEmpty = inventory !== null && inventory.length === 0;
  const itemAction = confirmedEmpty
    ? "Post the first useful item"
    : "Post a useful item";
  const skillAction = confirmedEmpty
    ? "Offer the first useful skill"
    : "Offer a useful skill";

  return (
    <div className="pb-20">
      <section className="border-b border-surface-200 bg-ink-900 text-white">
        <Container size="lg" className="py-14 sm:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-200">
            <MapPin className="h-3.5 w-3.5" /> Local circle invitation
          </p>
          <h1 className="display mt-5 max-w-4xl text-balance text-4xl text-white sm:text-6xl">
            {hasInventory
              ? `Trade locally around ZIP ${zip}.`
              : `Help start a barter circle around ZIP ${zip}.`}
          </h1>
          <p className="mt-5 max-w-3xl text-balance text-base leading-relaxed text-white/75 sm:text-lg">
            {hasInventory
              ? "These are genuine active offers marked for local exchange in this exact ZIP. Open one that fits, propose a fair return, or add another offer the circle can use."
              : confirmedEmpty
                ? "There are no active local offers in this exact ZIP yet. A real circle starts when someone posts one useful item or skill, invites one plausible trading partner, and completes a fair trade."
                : "See genuine local offers if they exist, or add one useful item or skill you can really exchange. This page never counts remote supply as local activity."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {hasInventory ? (
              <a href="#local-offers" className="btn-brand">
                See local offers <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <Link
                to={listingStarterPath("useful_item", zip)}
                className="btn-brand"
              >
                {itemAction} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              to={listingStarterPath(
                hasInventory ? "useful_item" : "one_hour_help",
                zip
              )}
              className="btn-outline border-white/30 bg-white/10 text-white hover:bg-white/15"
            >
              {hasInventory ? "Add another offer" : skillAction}
            </Link>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/50">
            Nothing is posted, shared, or subscribed for you. A free account
            is required to publish a genuine offer. Phone is optional, exact
            addresses stay private, and public maps use privacy-coarsened
            areas.
          </p>
        </Container>
      </section>

      <Container size="lg" className="py-12 sm:py-16">
        {hasInventory ? (
          <section
            id="local-offers"
            className="scroll-mt-24"
            aria-labelledby="local-offers-heading"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Active in ZIP {zip}
            </p>
            <h2
              id="local-offers-heading"
              className="display mt-2 text-3xl text-ink-900 sm:text-4xl"
            >
              Start with a real offer, not an empty feed.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-500">
              These listings are marked for in-person exchange in this exact
              ZIP. Opening one does not create a match; a genuine proposal
              starts the conversation.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inventory?.map((listing) => (
                <ListingCard key={listing.id} l={listing} />
              ))}
            </div>
          </section>
        ) : inventory === null && !inventoryUnavailable ? (
          <section
            className="flex items-center gap-3 rounded-2xl border border-surface-200 bg-white px-5 py-4 text-sm text-ink-500"
            aria-live="polite"
          >
            <Loader2
              className="h-4 w-4 animate-spin text-brand-600"
              aria-hidden
            />
            Checking this ZIP for genuine local offers…
          </section>
        ) : inventoryUnavailable ? (
          <section
            className="rounded-2xl border border-surface-200 bg-white px-5 py-4 text-sm text-ink-500"
            role="status"
          >
            Local inventory is temporarily unavailable. You can still add a
            genuine offer; this page will not claim the ZIP is empty.
          </section>
        ) : null}

        <section
          aria-labelledby="circle-steps-heading"
          className={
            hasInventory || inventory === null || inventoryUnavailable
              ? "mt-12"
              : undefined
          }
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            One honest starting loop
          </p>
          <h2
            id="circle-steps-heading"
            className="display mt-2 text-3xl text-ink-900 sm:text-4xl"
          >
            Supply first. One invitation second. Real exchange last.
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <Step
              icon={<MapPin className="h-5 w-5" />}
              number="1"
              title="Post something specific"
              body="Offer an item you actually own or a skill you can genuinely perform around this ZIP."
            />
            <Step
              icon={<Users className="h-5 w-5" />}
              number="2"
              title="Invite one plausible person"
              body="Share the exact offer with someone who might want it and have a fair return—not a mass audience."
            />
            <Step
              icon={<ShieldCheck className="h-5 w-5" />}
              number="3"
              title="Confirm what really happened"
              body="Agree clearly, exchange safely, and count a trade only after both people separately confirm completion."
            />
          </div>
        </section>

        <section id="share" className="mt-12 scroll-mt-24">
          <StartCircleInvite
            initialZip={zip}
            state={
              hasInventory ? "active" : confirmedEmpty ? "start" : "unknown"
            }
            fixedZip
          />
        </section>

        <div className="mt-8 text-center text-sm text-ink-500">
          Need a remote exchange instead?{" "}
          <Link
            to="/movement"
            className="font-semibold text-brand-700 hover:underline"
          >
            Join the nationwide barter movement
          </Link>
          .
        </div>
      </Container>
    </div>
  );
}

function Step({
  icon,
  number,
  title,
  body,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  body: string;
}) {
  return (
    <article className="card p-6">
      <div className="flex items-center justify-between text-brand-700">
        {icon}
        <span className="font-mono text-xs text-ink-400">0{number}</span>
      </div>
      <h3 className="mt-5 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>
    </article>
  );
}
