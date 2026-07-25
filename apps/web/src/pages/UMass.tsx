import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Handshake,
  PackageOpen,
  Recycle,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Container } from "../ui/Container.js";
import { InviteNeighbors } from "../ui/InviteNeighbors.js";
import { useSession } from "../lib/session.js";
import {
  listingStarterPath,
  type ListingStarterId,
} from "../lib/listingStarters.js";
import { withNext } from "../lib/navigation.js";
import { api } from "../lib/api.js";
import { ShareListing } from "../ui/ShareListing.js";

const PAGE_DESCRIPTION =
  "A free UMass Amherst-area barter pilot for dorm gear, textbooks, and skills. No listing fees or transaction fees.";
const UMASS_BROWSE_PATH =
  "/browse?lat=42.389326&lng=-72.528361&radiusKm=20&place=UMass+Amherst+area";

interface PilotProgress {
  area: string;
  radiusKm: number;
  current: {
    foundingTraders: number;
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
  updatedAt: number;
}

interface PersonalPilotProgress {
  current: {
    postedListings: number;
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
}

export default function UMassPage() {
  const { session } = useSession();
  const [progress, setProgress] = useState<PilotProgress | null>(null);
  const [personalProgress, setPersonalProgress] =
    useState<PersonalPilotProgress | null>(null);
  const postPath = session?.authenticated
    ? "/post"
    : withNext("/signup", "/post");
  const starterPath = (id: ListingStarterId) => {
    const path = listingStarterPath(id);
    return session?.authenticated ? path : withNext("/signup", path);
  };

  useEffect(() => {
    api<PilotProgress>("/growth/umass-progress")
      .then(setProgress)
      .catch(() => {
        // The page and its core actions remain useful if the public aggregate
        // is temporarily unavailable.
      });
  }, []);

  useEffect(() => {
    if (!session?.authenticated) {
      setPersonalProgress(null);
      return;
    }
    api<PersonalPilotProgress>("/growth/umass-me")
      .then(setPersonalProgress)
      .catch(() => setPersonalProgress(null));
  }, [session?.authenticated]);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const previousDescription = description?.content;

    document.title = "UMass barter pilot — unscrewed.lol";
    if (description) description.content = PAGE_DESCRIPTION;

    return () => {
      document.title = previousTitle;
      if (description && previousDescription)
        description.content = previousDescription;
    };
  }, []);

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden border-b border-surface-200">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-50 via-surface-50 to-accent-lemon/45" />
        <Container size="xl" className="py-14 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-card ring-1 ring-surface-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                UMass Amherst-area pilot
              </div>
              <h1 className="display mt-5 max-w-3xl text-balance text-5xl leading-[1.02] text-ink-900 sm:text-6xl">
                Keep useful stuff—and useful skills—
                <span className="block text-brand-600">
                  moving around campus.
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-lg">
                Trade dorm gear, textbooks, help moving, tutoring, bike repair,
                and more with people nearby. No money required. No listing
                fees. No transaction fees.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={postPath} className="btn-brand text-base">
                  {session?.authenticated
                    ? "Post your first trade"
                    : "Join and post a trade"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to={UMASS_BROWSE_PATH}
                  className="btn-outline bg-white text-base"
                >
                  Browse UMass-area trades
                </Link>
              </div>
              <p className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-400">
                unscrewed is an independent community project. It is not
                affiliated with or endorsed by UMass Amherst or New2U.
                <Link
                  to="/public-benefit"
                  className="ml-1 font-semibold text-brand-700 hover:underline"
                >
                  Review its public-benefit commitments and live outcomes.
                </Link>
              </p>
            </div>

            <div className="rounded-3xl bg-ink-900 p-6 text-white shadow-pop sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">
                Start with one useful listing
              </p>
              <div className="mt-5 grid gap-3">
                <Example
                  icon={<PackageOpen className="h-5 w-5" />}
                  have="Mini-fridge"
                  want="Desk lamp + storage bins"
                  to={starterPath("dorm_fridge")}
                />
                <Example
                  icon={<BookOpen className="h-5 w-5" />}
                  have="Calc textbook"
                  want="Chemistry textbook"
                  to={starterPath("course_textbook")}
                />
                <Example
                  icon={<Wrench className="h-5 w-5" />}
                  have="Bike repair"
                  want="Help moving"
                  to={starterPath("bike_repair")}
                />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-white/60">
                These are editable starters, not fabricated listings. Nothing
                is posted until a real person adds accurate details and
                submits it.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container size="xl" className="mt-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Built to complement campus reuse
          </p>
          <h2 className="display mt-2 text-balance text-3xl text-ink-900 sm:text-4xl">
            Collection programs matter. Direct neighbor-to-neighbor exchange
            fills different gaps.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-ink-500">
            Programs like New2U collect and recirculate physical goods.
            unscrewed adds a free direct path for timing mismatches, items that
            need a person-to-person handoff, and skills that cannot sit on a
            store shelf.
          </p>
          <a
            href="https://www.umass.edu/sustainability/get-involved/new2u"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            Learn about New2U on the official UMass site
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <GapCard
            icon={<Clock3 className="h-5 w-5" />}
            title="Between campus events"
            body="A student who needs something today can find the person who is done with it today."
          />
          <GapCard
            icon={<Handshake className="h-5 w-5" />}
            title="Direct handoffs"
            body="Neighbors arrange the terms and meeting themselves; unscrewed never takes a cut."
          />
          <GapCard
            icon={<Wrench className="h-5 w-5" />}
            title="Skills count too"
            body="Tutoring, repairs, rides, creative help, and time can be exchanged alongside goods."
          />
        </div>
      </Container>

      <Container size="lg" className="mt-20">
        <div className="card p-8 sm:p-12">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              A small, measurable pilot
            </p>
            <h2 className="display mt-2 text-3xl text-ink-900">
              Useful beats viral.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
              The first goal is not a giant signup number. It is enough nearby
              listings that a UMass-area member can find a real trade.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Principle
              icon={<Recycle className="h-5 w-5" />}
              title="Keep value local"
              body="Reuse goods and overlooked skills before buying another duplicate."
            />
            <Principle
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Core barter stays free"
              body="Browsing, posting, negotiating, and signing a trade have no platform fee."
            />
            <Principle
              icon={<Handshake className="h-5 w-5" />}
              title="Measure real activation"
              body="Success means new members post listings—not merely that they click a link."
            />
          </div>
          {session?.authenticated && (
            <PersonalPilotChecklist
              progress={personalProgress}
              postPath={postPath}
            />
          )}
          <PilotScoreboard progress={progress} />
        </div>
      </Container>

      <Container size="xl" className="mt-16">
        <InviteNeighbors audience="umass" />
      </Container>

      <Container size="lg" className="mt-16">
        <div className="rounded-3xl bg-brand-800 p-8 text-center text-white sm:p-12">
          <h2 className="display text-balance text-3xl sm:text-4xl">
            Put one useful thing into circulation.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
            One dorm item, one textbook, or one skill is enough to help build
            the first useful local pool.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to={postPath}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50"
            >
              {session?.authenticated
                ? "Post your first trade"
                : "Join and post"}
            </Link>
            <Link
              to={UMASS_BROWSE_PATH}
              className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Browse UMass-area trades
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

function PersonalPilotChecklist({
  progress,
  postPath,
}: {
  progress: PersonalPilotProgress | null;
  postPath: string;
}) {
  if (!progress) {
    return (
      <div
        className="mt-8 h-40 animate-pulse rounded-2xl bg-brand-50"
        aria-label="Loading your founding-trader checklist"
      />
    );
  }

  const posted = Math.min(progress.current.postedListings, 2);
  const hasConversation = progress.current.twoSidedConversations > 0;
  const hasTrade = progress.current.completedTrades > 0;

  return (
    <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-left sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
        Your founding-trader checklist
      </p>
      <h3 className="mt-1 text-xl font-semibold text-ink-900">
        Turn your account into one useful local connection.
      </h3>
      <ol className="mt-5 space-y-4">
        <ChecklistItem
          complete={posted >= 2}
          title={`Post two genuine local offers · ${posted}/2`}
          body="A good plus a skill usually creates more possible matches than two similar items."
        >
          {posted < 2 && (
            <Link to={postPath} className="btn-brand mt-3 inline-flex">
              {posted === 0 ? "Post your first offer" : "Post a different second offer"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </ChecklistItem>
        <ChecklistItem
          complete={null}
          title="Manual step: invite one plausible person per active listing"
          body="This is a human step, so the checklist does not pretend a copied link was opened. Send each listing only to someone who may genuinely want it."
        >
          {progress.activeListings.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {progress.activeListings.slice(0, 4).map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-xl border border-brand-200 bg-white p-3"
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
                    owner
                  />
                </div>
              ))}
            </div>
          )}
        </ChecklistItem>
        <ChecklistItem
          complete={hasConversation}
          title={`Have a two-sided conversation · ${progress.current.twoSidedConversations}`}
          body="A proposal alone does not count. This completes only after both people have replied."
        >
          {!hasConversation && (
            <Link
              to="/trades"
              className="mt-2 inline-flex text-sm font-semibold text-brand-700 hover:underline"
            >
              Check My trades
            </Link>
          )}
        </ChecklistItem>
        <ChecklistItem
          complete={hasTrade}
          title={`Complete a fair trade · ${progress.current.completedTrades}`}
          body="Only a contract signed by both people counts. Never complete a bad match for the metric."
        />
      </ol>
    </div>
  );
}

function ChecklistItem({
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
        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
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
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{body}</p>
        {children}
      </div>
    </li>
  );
}

function PilotScoreboard({ progress }: { progress: PilotProgress | null }) {
  if (!progress) {
    return (
      <div
        className="mt-8 h-36 animate-pulse rounded-2xl bg-surface-100"
        aria-label="Loading live pilot progress"
      />
    );
  }

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

  return (
    <div className="mt-10 rounded-2xl border border-surface-200 bg-surface-50 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Live first-sprint progress
          </p>
          <h3 className="mt-1 text-lg font-semibold text-ink-900">
            Every number below comes from real activity.
          </h3>
        </div>
        <p className="text-xs text-ink-400">
          {progress.radiusKm} km around UMass Amherst
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => {
          const percentage = Math.min(
            100,
            Math.round((metric.current / metric.target) * 100)
          );
          return (
            <div key={metric.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink-700">
                  {metric.label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-ink-900">
                  {metric.current} / {metric.target}
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-surface-200"
                role="progressbar"
                aria-label={metric.label}
                aria-valuemin={0}
                aria-valuemax={metric.target}
                aria-valuenow={Math.min(metric.current, metric.target)}
              >
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-ink-500">
        A trader is counted after posting a genuine local listing. A
        conversation counts only after both people reply. A completed trade
        requires both signatures. This checkpoint is not a claim of campus
        adoption or UMass endorsement.
      </p>
    </div>
  );
}

function Example({
  icon,
  have,
  want,
  to,
}: {
  icon: React.ReactNode;
  have: string;
  want: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition-colors hover:border-brand-300/40 hover:bg-white/[0.1] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300/30"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-300/15 text-brand-200">
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-semibold text-white">{have}</span>
        <span className="mx-2 text-white/35">for</span>
        <span className="text-white/70">{want}</span>
        <span className="mt-1 block text-xs font-semibold text-brand-200 group-hover:text-white">
          Use this starter
        </span>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
    </Link>
  );
}

function GapCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-6">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <h3 className="mt-4 font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>
    </div>
  );
}

function Principle({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{body}</p>
    </div>
  );
}
