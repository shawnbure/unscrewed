import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Laptop,
  Check,
  CheckCircle2,
  X,
  Pencil,
} from "lucide-react";
import { Container } from "../ui/Container.js";
import { CATEGORIES } from "../ui/CategoryTile.js";
import { CategoryIcon } from "../ui/CategoryIcons.js";
import { ReportButton } from "../ui/ReportButton.js";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";
import { photoUrl } from "../lib/photoUrl.js";
import { ShareListing } from "../ui/ShareListing.js";
import { withNext } from "../lib/navigation.js";
import { ListingMatchability } from "../ui/ListingMatchability.js";
import { ListingShareOutcomes } from "../ui/ListingShareOutcomes.js";
import {
  hasProposalPlaceholders,
  PROPOSAL_STARTERS,
  proposalOfferingFromListing,
  type ProposalListingOption,
} from "../lib/proposal.js";

interface ListingFull {
  id: string;
  title: string;
  description: string;
  wants: string;
  kind: "good" | "service";
  exchangeMode: "local" | "remote" | "either";
  category: string;
  condition?: string | null;
  postalCode?: string;
  dateCreated?: number;
  isOwner?: boolean;
}
interface Photo {
  r2Key?: string;
}

export default function ListingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useSession();
  const [data, setData] = useState<{
    listing: ListingFull;
    photos: Photo[];
  } | null>(null);
  const [idx, setIdx] = useState(0);
  const [showPropose, setShowPropose] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<{ listing: ListingFull; photos: Photo[] }>(`/listings/${id}`)
      .then(setData)
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!data) return;
    const listing = data.listing;
    const location = listing.exchangeMode === "remote"
      ? " remotely"
      : listing.postalCode?.trim()
      ? ` near ${listing.postalCode.trim()}`
      : "";
    const pageTitle = truncateMeta(
      `${compactMeta(listing.title)} — barter${location} | unscrewed.lol`,
      90
    );
    const description = truncateMeta(
      `Looking to trade for ${withoutTrailingPunctuation(listing.wants)}. ${compactMeta(listing.description)}`,
      160
    );
    const canonical = `${window.location.origin}/listing/${encodeURIComponent(listing.id)}`;
    const firstPhoto = data.photos.find((photo) => photo.r2Key)?.r2Key;
    const image = firstPhoto
      ? photoUrl(firstPhoto)
      : `${window.location.origin}/og.png`;
    const imageAlt = firstPhoto
      ? `Photo for ${compactMeta(listing.title)}`
      : "Neighbors exchanging goods, tools, and skills through unscrewed.lol";
    const previousTitle = document.title;
    const restores = [
      setMeta('meta[name="description"]', description),
      setMeta('meta[property="og:url"]', canonical),
      setMeta('meta[property="og:title"]', pageTitle),
      setMeta('meta[property="og:description"]', description),
      setMeta('meta[property="og:image"]', image),
      setMeta('meta[property="og:image:alt"]', imageAlt),
      setMeta('meta[name="twitter:title"]', pageTitle),
      setMeta('meta[name="twitter:description"]', description),
      setMeta('meta[name="twitter:image"]', image),
      setCanonical(canonical),
    ];
    document.title = pageTitle;

    return () => {
      document.title = previousTitle;
      restores.forEach((restore) => restore());
    };
  }, [data]);

  useEffect(() => {
    if (
      !data ||
      !session?.authenticated ||
      data.listing.isOwner === true ||
      searchParams.get("propose") !== "1"
    ) {
      return;
    }
    setShowPropose(true);
    const remaining = new URLSearchParams(searchParams);
    remaining.delete("propose");
    setSearchParams(remaining, { replace: true });
  }, [data, searchParams, session?.authenticated, setSearchParams]);

  if (!data)
    return (
      <Container size="lg" className="py-10">
        <div className="card h-72 animate-pulse" />
      </Container>
    );

  const { listing: l, photos } = data;
  const cat = CATEGORIES.find((c) => c.slug === l.category);
  const photoKeys = photos.map((p) => p.r2Key!).filter(Boolean);
  const current = photoKeys[idx];
  const justPosted = searchParams.get("posted") === "1" && l.isOwner === true;

  return (
    <Container size="lg" className="py-6">
      <Link
        to="/browse"
        className="text-sm text-ink-500 hover:text-brand-700"
      >
        ← Back to browse
      </Link>

      {justPosted && (
        <section
          className="mt-4 rounded-3xl bg-brand-800 p-6 text-white shadow-card sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8"
          aria-labelledby="listing-live-heading"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 h-6 w-6 shrink-0 text-brand-200"
              strokeWidth={2}
            />
            <div>
              <h2
                id="listing-live-heading"
                className="text-xl font-bold text-white"
              >
                Your trade is live.
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/70">
                {l.exchangeMode === "remote"
                  ? "The fastest path to a real proposal is one person who could use this remote offer."
                  : l.exchangeMode === "either"
                    ? "The fastest path to a real proposal is one relevant local or remote person."
                    : "The fastest path to a real proposal is one relevant nearby person."}{" "}
                Send them this listing directly—no mass posting or referral
                contest needed.
              </p>
            </div>
          </div>
          <div className="shrink-0 sm:text-right">
            <ShareListing
              id={l.id}
              title={l.title}
              wants={l.wants}
              postalCode={l.postalCode}
              exchangeMode={l.exchangeMode}
              owner
              variant="success"
            />
          </div>
        </section>
      )}

      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Photo carousel */}
        <div>
          <div
            className={`card relative aspect-[4/3] w-full overflow-hidden ${cat?.tint ?? "bg-sand-100"}`}
          >
            {current ? (
              <img
                src={photoUrl(current)}
                alt={l.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className={`flex h-full items-center justify-center ${cat?.iconColor ?? "text-ink-400"}`}>
                <CategoryIcon slug={l.category} className="h-20 w-20" />
              </div>
            )}
            {photoKeys.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-white/95 p-2 shadow-card hover:bg-white"
                  onClick={() =>
                    setIdx((i) => (i - 1 + photoKeys.length) % photoKeys.length)
                  }
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-white/95 p-2 shadow-card hover:bg-white"
                  onClick={() => setIdx((i) => (i + 1) % photoKeys.length)}
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>
          {photoKeys.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8">
              {photoKeys.map((k, i) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setIdx(i)}
                    className={`block aspect-square w-full overflow-hidden rounded-lg border ${
                      i === idx ? "border-brand-500" : "border-transparent"
                    }`}
                  >
                    <img
                      src={photoUrl(k)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <span className="chip">{l.kind}</span>
              {cat && (
                <span className="chip">
                  <CategoryIcon slug={cat.slug} className="h-3.5 w-3.5" />
                  {cat.label}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">
              {l.title}
            </h1>
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-500">
              {l.exchangeMode === "remote" ? (
                <Laptop className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {l.exchangeMode === "remote"
                ? "Remote · available across the U.S."
                : l.exchangeMode === "either"
                  ? `${l.postalCode ?? "—"} · local or remote`
                  : l.postalCode ?? "—"}
              {l.dateCreated
                ? ` · posted ${formatRelative(l.dateCreated)}`
                : ""}
            </p>

            <div className="mt-5 rounded-xl bg-brand-50 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                Wants in trade
              </div>
              <p className="mt-1 text-ink-900">{l.wants}</p>
            </div>

            {(() => {
              const proposalPath = `/listing/${l.id}?propose=1`;
              const signupPath = withNext("/signup", proposalPath);
              const proposalSignupPath =
                l.exchangeMode === "remote"
                  ? `${signupPath}&exchange=remote`
                  : signupPath;
              if (session === null) {
                return (
                  <>
                    <button
                      type="button"
                      disabled
                      className="btn-primary mt-5 w-full"
                    >
                      Checking account…
                    </button>
                    <p className="mt-2 text-center text-xs text-ink-400">
                      You'll chat to negotiate before signing anything.
                    </p>
                  </>
                );
              }
              const canEdit =
                session.authenticated &&
                (l.isOwner === true || session.isAdmin);
              if (canEdit) {
                return (
                  <>
                    <Link
                      to={`/listing/${l.id}/edit`}
                      className="btn-primary mt-5 flex w-full items-center justify-center gap-2"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                      Edit this trade
                    </Link>
                    <p className="mt-2 text-center text-xs text-ink-400">
                      This is your listing. You can update, withdraw, or delete
                      it.
                    </p>
                  </>
                );
              }
              if (!session.authenticated) {
                return (
                  <>
                    <Link
                      to={proposalSignupPath}
                      className="btn-primary mt-5 flex w-full items-center justify-center"
                    >
                      Create account to propose
                    </Link>
                    <p className="mt-2 text-center text-xs text-ink-400">
                      Already a member?{" "}
                      <Link
                        to={withNext("/login", proposalPath)}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        Sign in and return here
                      </Link>
                      . Otherwise, create your account and come straight back
                      to this trade.
                    </p>
                    <p className="mt-2 text-center text-xs font-medium text-ink-600">
                      No payment information or platform fee. You can propose
                      immediately after signup; email verification only turns
                      on trade alerts.
                    </p>
                  </>
                );
              }
              return (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPropose(true)}
                    className="btn-primary mt-5 w-full"
                  >
                    Propose a trade
                  </button>
                  <p className="mt-2 text-center text-xs text-ink-400">
                    You'll chat to negotiate before signing anything.
                  </p>
                </>
              );
            })()}
            {!justPosted && (
              <ShareListing
                id={l.id}
                title={l.title}
                wants={l.wants}
                postalCode={l.postalCode}
                exchangeMode={l.exchangeMode}
                owner={l.isOwner === true}
              />
            )}
          </div>

          {l.isOwner === true && (
            <>
              <ListingMatchability
                input={{
                  kind: l.kind,
                  title: l.title,
                  description: l.description,
                  wants: l.wants,
                  photoCount: photoKeys.length,
                }}
                editHref={`/listing/${l.id}/edit`}
              />
              <ListingShareOutcomes listingId={l.id} />
            </>
          )}

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-700">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">
              {l.description}
            </p>
            <div className="mt-4 flex justify-end border-t border-surface-200 pt-3">
              <ReportButton targetType="listing" targetId={l.id} variant="link" />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink-700">
              Before you trade
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-ink-500">
              {l.exchangeMode === "remote" ? (
                <SafetyLi tone="good">
                  Keep the first call on a familiar platform and do not share
                  account credentials, financial information, or remote-device
                  access.
                </SafetyLi>
              ) : (
                <SafetyLi tone="good">
                  Meet in a public place, ideally during daylight.
                </SafetyLi>
              )}
              <SafetyLi tone="good">
                {l.exchangeMode === "remote"
                  ? "Agree on the exact session length, deliverable, and exchange before starting."
                  : "Inspect the item or scope the service before exchanging."}
              </SafetyLi>
              <SafetyLi tone="good">
                Both sides sign the terms in chat. After the real exchange,
                each person separately confirms completion.
              </SafetyLi>
              <SafetyLi tone="bad">
                unscrewed.lol is not party to the trade — see{" "}
                <Link to="/tos" className="underline">
                  Terms
                </Link>
                .
              </SafetyLi>
            </ul>
            <Link
              to="/safety"
              className="mt-3 inline-flex text-xs font-semibold text-brand-700 hover:underline"
            >
              Read the safety guide
            </Link>
          </div>
        </aside>
      </div>

      {showPropose && (
        <ProposeModal
          listingId={l.id}
          listingWants={l.wants}
          onClose={() => setShowPropose(false)}
          onSent={(negId) => nav(`/n/${negId}`)}
        />
      )}
    </Container>
  );
}

function ProposeModal({
  listingId,
  listingWants,
  onClose,
  onSent,
}: {
  listingId: string;
  listingWants: string;
  onClose: () => void;
  onSent: (negotiationId: string) => void;
}) {
  const [offering, setOffering] = useState("");
  const [openingMessage, setOpeningMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myListings, setMyListings] = useState<ProposalListingOption[] | null>(
    null
  );
  const draftHasPlaceholders = hasProposalPlaceholders(
    offering,
    openingMessage
  );

  useEffect(() => {
    let cancelled = false;
    api<{ items: ProposalListingOption[] }>("/me/listings")
      .then((response) => {
        if (!cancelled) setMyListings(response.items);
      })
      .catch(() => {
        if (!cancelled) setMyListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (draftHasPlaceholders) {
      setError("Replace every [bracketed prompt] before sending.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ id: string }>("/negotiations", {
        method: "POST",
        body: JSON.stringify({ listingId, offering, openingMessage }),
      });
      onSent(r.id);
    } catch (e: any) {
      // Surface zod field issues if the API returned them
      const fieldErr = e?.body?.issues?.[0];
      const msg =
        fieldErr?.message ??
        e?.body?.message ??
        e?.body?.error ??
        e?.message ??
        "Could not send the proposal.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="card max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-ink-900">Propose a trade</h2>
        <p className="mt-1 text-sm text-ink-500">
          Tell the lister what you're offering and start the conversation.
        </p>
        <div className="mt-4 rounded-xl bg-brand-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            They are looking for
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-800">
            {listingWants}
          </p>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <fieldset className="rounded-xl border border-surface-200 p-3">
            <legend className="px-1 text-xs font-semibold text-ink-700">
              Start with an editable draft
            </legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {PROPOSAL_STARTERS.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  onClick={() => {
                    setOffering(starter.offering);
                    setOpeningMessage(starter.openingMessage);
                    setError(null);
                  }}
                  className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
                >
                  {starter.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
              Choosing one replaces the two draft fields below and sends
              nothing. Replace every [bracketed prompt] with something you can
              genuinely provide.
            </p>
          </fieldset>
          {myListings && myListings.length > 0 && (
            <fieldset className="rounded-xl border border-surface-200 p-3">
              <legend className="px-1 text-xs font-semibold text-ink-700">
                Use one of your active listings
              </legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {myListings.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() =>
                      setOffering(proposalOfferingFromListing(listing))
                    }
                    className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-left text-xs transition-colors hover:border-brand-400 hover:bg-brand-50"
                  >
                    <span className="block font-semibold text-ink-900">
                      {listing.title}
                    </span>
                    <span className="mt-0.5 block text-ink-400">
                      {listing.kind} · {listing.postalCode}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
                Choosing one fills editable offer text only. It does not
                reserve, transfer, or send that listing.
              </p>
            </fieldset>
          )}
          {myListings && myListings.length === 0 && (
            <p className="rounded-xl border border-dashed border-surface-300 p-3 text-xs leading-relaxed text-ink-500">
              You have no active listing to reuse. That is okay—describe any
              real item, skill, or time you can offer below.
            </p>
          )}
          <label className="block">
            <span className="label">What are you offering?</span>
            <textarea
              required
              minLength={2}
              maxLength={1000}
              rows={2}
              value={offering}
              onChange={(e) => setOffering(e.target.value)}
              className="input mt-1"
              placeholder="e.g. 4 hours of lawn care, or my old Stratocaster"
            />
          </label>
          <label className="block">
            <span className="label">Opening message</span>
            <textarea
              required
              minLength={2}
              maxLength={2000}
              rows={4}
              value={openingMessage}
              onChange={(e) => setOpeningMessage(e.target.value)}
              className="input mt-1"
              placeholder="Say hi — explain the trade and ask any questions."
            />
          </label>
          {draftHasPlaceholders && (
            <p className="text-xs font-medium text-amber-700">
              Replace every [bracketed prompt] before sending.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || draftHasPlaceholders}
              className="btn-primary"
            >
              {busy ? "Sending…" : "Send proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SafetyLi({
  tone,
  children,
}: {
  tone: "good" | "bad";
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-1.5">
      {tone === "good" ? (
        <Check
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600"
          strokeWidth={2.5}
        />
      ) : (
        <X
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600"
          strokeWidth={2.5}
        />
      )}
      <span>{children}</span>
    </li>
  );
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
}

function compactMeta(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function withoutTrailingPunctuation(value: string): string {
  return compactMeta(value).replace(/[.!?]+$/, "");
}

function truncateMeta(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function setMeta(selector: string, content: string): () => void {
  const element = document.querySelector<HTMLMetaElement>(selector);
  if (!element) return () => {};
  const previous = element.content;
  element.content = content;
  return () => {
    element.content = previous;
  };
}

function setCanonical(href: string): () => void {
  const element = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!element) return () => {};
  const previous = element.href;
  element.href = href;
  return () => {
    element.href = previous;
  };
}
