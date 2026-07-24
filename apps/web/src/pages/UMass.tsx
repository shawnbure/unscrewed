import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
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
import { withNext } from "../lib/navigation.js";

const PAGE_DESCRIPTION =
  "A free UMass Amherst-area barter pilot for dorm gear, textbooks, and skills. No listing fees or transaction fees.";
const UMASS_BROWSE_PATH =
  "/browse?lat=42.389326&lng=-72.528361&radiusKm=20&place=UMass+Amherst+area";

export default function UMassPage() {
  const { session } = useSession();
  const postPath = session?.authenticated
    ? "/post"
    : withNext("/signup", "/post");

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
                />
                <Example
                  icon={<BookOpen className="h-5 w-5" />}
                  have="Calc textbook"
                  want="Chemistry textbook"
                />
                <Example
                  icon={<Wrench className="h-5 w-5" />}
                  have="Bike repair"
                  want="Help moving"
                />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-white/60">
                These are examples, not fabricated listings. Real neighbors
                decide what a fair trade looks like.
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

function Example({
  icon,
  have,
  want,
}: {
  icon: React.ReactNode;
  have: string;
  want: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-300/15 text-brand-200">
        {icon}
      </span>
      <div className="min-w-0 text-sm">
        <span className="font-semibold text-white">{have}</span>
        <span className="mx-2 text-white/35">for</span>
        <span className="text-white/70">{want}</span>
      </div>
    </div>
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
