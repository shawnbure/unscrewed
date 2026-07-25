import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api } from "../lib/api.js";
import { listingStarterPath } from "../lib/listingStarters.js";
import { Container } from "../ui/Container.js";
import { ShareListing } from "../ui/ShareListing.js";

interface LocalProgress {
  area: string;
  zip: string;
  radiusKm: number;
  current: {
    foundingTraders: number;
    activeListings: number;
    twoSidedConversations: number;
    completedTrades: number;
  };
  mine: {
    postedListings: number;
    activeListings: number;
    twoSidedConversations: number;
    completedTrades: number;
  };
  targets: {
    foundingTraders: number;
    activeListings: number;
    twoSidedConversations: number;
    completedTrades: number;
  };
  activeListings: {
    id: string;
    title: string;
    wants: string;
    postalCode: string;
  }[];
  updatedAt: number;
}

interface MeLocation {
  homeLat: number | null;
  homeLng: number | null;
}

export default function NeighborhoodPage() {
  const [progress, setProgress] = useState<LocalProgress | null>(null);
  const [location, setLocation] = useState<MeLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<LocalProgress>("/growth/local-me"),
      api<MeLocation>("/me"),
    ])
      .then(([nextProgress, me]) => {
        setProgress(nextProgress);
        setLocation(me);
      })
      .catch((e) => {
        setError(
          e?.body?.error === "home_location_unavailable"
            ? "Your home ZIP could not be placed on the map."
            : "Your local progress could not be loaded."
        );
      });
  }, []);

  if (error) {
    return (
      <Container size="sm" className="py-12">
        <section className="card p-7 text-center">
          <MapPin className="mx-auto h-8 w-8 text-brand-600" />
          <h1 className="mt-4 text-2xl font-bold text-ink-900">
            Set your local starting point
          </h1>
          <p className="mt-2 text-sm text-ink-500">{error}</p>
          <Link to="/account#home-zip" className="btn-brand mt-5 inline-flex">
            Review home ZIP
          </Link>
        </section>
      </Container>
    );
  }

  if (!progress || !location) {
    return (
      <Container size="xl" className="py-10">
        <div className="card h-72 animate-pulse" />
      </Container>
    );
  }

  const browsePath =
    Number.isFinite(location.homeLat) && Number.isFinite(location.homeLng)
      ? `/browse?${new URLSearchParams({
          lat: String(location.homeLat),
          lng: String(location.homeLng),
          radiusKm: String(progress.radiusKm),
          place: progress.area,
        })}`
      : "/browse";
  const metrics = [
    {
      label: "Founding traders",
      current: progress.current.foundingTraders,
      target: progress.targets.foundingTraders,
    },
    {
      label: "Active listings",
      current: progress.current.activeListings,
      target: progress.targets.activeListings,
    },
    {
      label: "Two-sided conversations",
      current: progress.current.twoSidedConversations,
      target: progress.targets.twoSidedConversations,
    },
    {
      label: "Completed trades",
      current: progress.current.completedTrades,
      target: progress.targets.completedTrades,
    },
  ];
  const postedTowardGoal = Math.min(progress.mine.postedListings, 2);

  return (
    <Container size="xl" className="py-8 sm:py-12">
      <header className="rounded-3xl bg-ink-900 p-7 text-white shadow-pop sm:p-10">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-brand-200">
            <MapPin className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
              Your local trade circle
            </p>
            <h1 className="display mt-2 text-balance text-4xl text-white sm:text-5xl">
              Make {progress.area} useful, one real trade at a time.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 sm:text-base">
              This private dashboard follows aggregate activity within roughly{" "}
              {progress.radiusKm} km of your home ZIP. It never shows who
              browsed, who lives nearby, or anyone’s exact location.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={browsePath} className="btn-brand">
                Browse your area <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/post"
                className="btn-outline border-white/30 bg-white/10 text-white hover:bg-white/15"
              >
                Post a real trade
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="local-progress-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Live first-sprint progress
            </p>
            <h2
              id="local-progress-heading"
              className="mt-1 text-2xl font-bold text-ink-900"
            >
              Real local outcomes, not vanity numbers
            </h2>
          </div>
          <p className="text-xs text-ink-400">
            Updated {new Date(progress.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <ProgressMetric key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Your next honest actions
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink-900">
            Turn one account into one useful connection
          </h2>
          <ol className="mt-6 space-y-6">
            <ActionStep
              complete={postedTowardGoal >= 2}
              title={`Post two different local offers · ${postedTowardGoal}/2`}
              body="A useful item plus a specific skill creates more possible matches than two vague offers."
            >
              {postedTowardGoal < 2 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={listingStarterPath("useful_item")}
                    className="btn-brand"
                  >
                    Start with an item
                  </Link>
                  <Link
                    to={listingStarterPath("one_hour_help")}
                    className="btn-outline"
                  >
                    Start with one hour of help
                  </Link>
                </div>
              )}
            </ActionStep>
            <ActionStep
              complete={null}
              title="Invite one plausible person per active listing"
              body="This remains a human step. Copying or opening a share sheet is not counted; a real visit and downstream action are."
            >
              {progress.activeListings.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {progress.activeListings.slice(0, 4).map((listing) => (
                    <div
                      key={listing.id}
                      className="rounded-xl border border-surface-200 bg-surface-50 p-3"
                    >
                      <Link
                        to={`/listing/${listing.id}`}
                        className="line-clamp-1 text-sm font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {listing.title}
                      </Link>
                      <ShareListing
                        id={listing.id}
                        title={listing.title}
                        wants={listing.wants}
                        postalCode={listing.postalCode}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-ink-400">
                  A listing-specific invitation appears here after you post.
                </p>
              )}
            </ActionStep>
            <ActionStep
              complete={progress.mine.twoSidedConversations > 0}
              title={`Have a two-sided conversation · ${progress.mine.twoSidedConversations}`}
              body="A proposal alone is not enough. This completes only after both people have replied."
            >
              <Link
                to="/trades"
                className="mt-2 inline-flex text-sm font-semibold text-brand-700 hover:underline"
              >
                Check My trades
              </Link>
            </ActionStep>
            <ActionStep
              complete={progress.mine.completedTrades > 0}
              title={`Complete a fair trade · ${progress.mine.completedTrades}`}
              body="Only an agreement signed by both people counts. Never complete a bad match for the metric."
            />
          </ol>
        </section>

        <aside className="space-y-4">
          <section className="card p-6">
            <Users className="h-5 w-5 text-brand-700" />
            <h2 className="mt-3 text-lg font-bold text-ink-900">
              Why density comes first
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              A marketplace is useful when nearby people can find relevant
              supply and reply. The first target is five real listers, ten
              active listings, three two-sided conversations, and one fair
              completed trade—not a viral signup count.
            </p>
          </section>
          <section className="card p-6">
            <ShieldCheck className="h-5 w-5 text-brand-700" />
            <h2 className="mt-3 text-lg font-bold text-ink-900">
              Prefer to wait for supply?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Local-listing alerts are optional and off by default. You can
              ask for at most one alert each day when a real listing appears
              near your home ZIP.
            </p>
            <Link
              to="/account#local-watch"
              className="mt-3 inline-flex text-sm font-semibold text-brand-700 hover:underline"
            >
              Review local-listing alerts
            </Link>
          </section>
        </aside>
      </div>
    </Container>
  );
}

function ProgressMetric({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const percentage = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink-700">{label}</span>
        <span className="font-bold tabular-nums text-ink-900">
          {current}/{target}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-200">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ActionStep({
  complete,
  title,
  body,
  children,
}: {
  complete: boolean | null;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
          complete === true
            ? "bg-brand-600 text-white"
            : complete === null
              ? "bg-accent-lemon text-ink-700"
              : "border-2 border-brand-300 bg-white text-transparent"
        }`}
        aria-hidden="true"
      >
        {complete === null ? (
          <ArrowRight className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">{body}</p>
        {children}
      </div>
    </li>
  );
}
