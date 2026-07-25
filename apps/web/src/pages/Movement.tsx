import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileSignature,
  Handshake,
  Laptop,
  MapPin,
  MessageSquare,
  PackagePlus,
  Sparkles,
  Users,
} from "lucide-react";
import { getStats, type StatsPayload } from "../lib/stats.js";
import { listingStarterPath } from "../lib/listingStarters.js";
import { Container } from "../ui/Container.js";
import { InviteNeighbors } from "../ui/InviteNeighbors.js";

export default function MovementPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const previousDescription = description?.content;
    document.title = "Start the barter movement across America — unscrewed.lol";
    if (description) {
      description.content =
        "Anyone in the United States can start a local barter circle: post one useful thing or skill, invite one plausible trading partner, and keep value in the community.";
    }
    getStats()
      .then(setStats)
      .catch(() => setStats(null));
    return () => {
      document.title = previousTitle;
      if (description && previousDescription) {
        description.content = previousDescription;
      }
    };
  }, []);

  const outcomes = [
    { label: "Members", value: stats?.members_total },
    { label: "Active offers", value: stats?.listings_active },
    {
      label: "Two-sided conversations",
      value: stats?.two_sided_conversations,
    },
    { label: "Completed trades", value: stats?.completed_trades },
  ];

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden border-b border-surface-200 bg-ink-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.2),transparent_45%)]" />
        <Container size="lg" className="relative py-16 sm:py-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-200">
            <MapPin className="h-3.5 w-3.5" />
            Open across the United States
          </p>
          <h1 className="display mt-6 max-w-5xl text-balance text-5xl leading-[0.98] text-white sm:text-7xl">
            Start the barter movement.
          </h1>
          <p className="mt-6 max-w-3xl text-balance text-lg leading-relaxed text-white/75 sm:text-xl">
            Money is tight. Useful things and human skills are everywhere.
            unscrewed gives people in every U.S. community a free way to trade
            directly—without a marketplace or payment processor taking a cut.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#start"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-400 px-5 py-3 text-sm font-bold text-ink-900 hover:bg-brand-300"
            >
              Choose my first offer <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/browse"
              className="rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              See what people are offering
            </Link>
          </div>
          <p className="mt-5 max-w-2xl text-xs leading-relaxed text-white/50">
            This is the beginning, not a claim that a national network already
            exists. The live numbers below include the zeroes.
          </p>
        </Container>
      </section>

      <Container size="lg" className="mt-12">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {outcomes.map((outcome) => (
            <div key={outcome.label} className="card p-5">
              <p className="text-3xl font-bold tabular-nums text-ink-900">
                {outcome.value === undefined
                  ? "—"
                  : outcome.value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-medium text-ink-500">
                {outcome.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-400">
          Nationwide marketplace outcomes, updated from the public stats
          endpoint. A conversation counts only after both people reply; a trade
          counts only after both people sign and separately confirm the
          exchange happened.
        </p>
      </Container>

      <Container size="lg" className="mt-16">
        <section id="start" className="scroll-mt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Put something useful into circulation
            </p>
            <h2 className="display mt-2 text-balance text-4xl text-ink-900">
              Choose a starting point. Make it yours before posting.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              Each starter opens an editable listing and preserves this
              movement campaign through signup. Nothing is posted, shared, or
              subscribed automatically.
            </p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <Starter
              to={listingStarterPath("useful_item")}
              icon={<PackagePlus className="h-6 w-6" />}
              title="A useful item"
              body="Name the exact item, its condition, pickup timing, and two or three things you would really accept."
              action="Start an item listing"
            />
            <Starter
              to={listingStarterPath("one_hour_help")}
              icon={<Handshake className="h-6 w-6" />}
              title="One hour of practical help"
              body="Define one task you can do, when you are available, what is included, and a realistic return."
              action="Start a local service"
            />
            <Starter
              to={listingStarterPath("remote_skill")}
              icon={<Laptop className="h-6 w-6" />}
              title="A remote skill session"
              body="Offer one specific 30-minute outcome by video or phone and trade it with someone anywhere in the country."
              action="Start a remote offer"
            />
          </div>
          <div className="mt-5 text-center">
            <Link
              to="/post"
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              Or write a blank listing from scratch
            </Link>
            <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-ink-400">
              Post only something you can genuinely provide. A template is not
              supply, and a signup is not a successful trade.
            </p>
          </div>
        </section>
      </Container>

      <Container size="lg" className="mt-16">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              How a movement starts
            </p>
            <h2 className="display mt-2 text-balance text-4xl text-ink-900">
              Don’t wait for a crowd. Start with one useful exchange.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              “Viral” should mean a useful pattern that another person can
              repeat—not inflated clicks, spam, or fake accounts.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Step
              number="1"
              icon={<PackagePlus className="h-5 w-5" />}
              title="Post one real offer"
              body="Choose a specific good, service, or skill you can genuinely provide."
            />
            <Step
              number="2"
              icon={<MessageSquare className="h-5 w-5" />}
              title="Invite one match"
              body="Send the listing to one person who might actually want it and have something to trade."
            />
            <Step
              number="3"
              icon={<FileSignature className="h-5 w-5" />}
              title="Complete a fair trade"
              body="Agree clearly, trade safely, and invite each participant to repeat the pattern once."
            />
          </div>
        </div>
      </Container>

      <Container size="xl" className="mt-16">
        <InviteNeighbors />
      </Container>

      <Container size="lg" className="mt-16">
        <section className="grid gap-8 rounded-3xl border border-surface-200 bg-white p-7 shadow-card sm:p-10 lg:grid-cols-2">
          <div>
            <Sparkles className="h-6 w-6 text-brand-600" />
            <h2 className="display mt-4 text-3xl text-ink-900">
              One country. Thousands of local circles.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              The platform is national because anyone in the United States can
              join. The exchanges are local because proximity builds trust,
              makes physical goods practical, and keeps value close to home.
              Remote skills can be traded across distance too.
            </p>
          </div>
          <div className="grid gap-3">
            <Principle
              icon={<Users className="h-5 w-5" />}
              title="People before promotion"
              body="A plausible trading partner matters more than a thousand empty impressions."
            />
            <Principle
              icon={<Handshake className="h-5 w-5" />}
              title="No transaction skim"
              body="Core barter stays free; unscrewed does not take a percentage of the exchange."
            />
            <Principle
              icon={<MapPin className="h-5 w-5" />}
              title="Local roots, national proof"
              body="Each community builds its own supply while public outcomes show whether the movement is creating real use."
            />
          </div>
        </section>
      </Container>

      <Container size="lg" className="mt-12 text-center">
        <h2 className="display text-3xl text-ink-900">
          Put the first useful offer on the map.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-500">
          You do not need permission from a forum or institution to offer
          something useful and invite one genuine trading partner.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="#start" className="btn-brand">
            Choose my first offer <ArrowRight className="h-4 w-4" />
          </a>
          <Link to="/public-benefit" className="btn-outline">
            Read the public-benefit commitments
          </Link>
        </div>
      </Container>
    </div>
  );
}

function Starter({
  to,
  icon,
  title,
  body,
  action,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className="group card flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:ring-brand-300"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">
        {body}
      </p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
        {action}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}

function Step({
  number,
  icon,
  title,
  body,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="card relative p-5">
      <span className="absolute right-4 top-3 text-4xl font-black text-surface-100">
        {number}
      </span>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>
    </article>
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
    <div className="flex gap-3 rounded-2xl bg-surface-50 p-4">
      <span className="mt-0.5 text-brand-700">{icon}</span>
      <div>
        <h3 className="font-semibold text-ink-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{body}</p>
      </div>
    </div>
  );
}
