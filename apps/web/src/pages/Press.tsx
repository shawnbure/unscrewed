import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Code2,
  Download,
  FileText,
  MapPin,
  Recycle,
} from "lucide-react";
import { getStats, type StatsPayload } from "../lib/stats.js";
import { Container } from "../ui/Container.js";

const FACTS = [
  ["Project base", "Chandler, Arizona"],
  ["Availability", "United States"],
  ["Model", "Direct barter; no platform listing or transaction fees"],
  ["Status", "Independent, very early public-benefit experiment"],
] as const;

export default function PressPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const previousDescription = description?.content;
    document.title = "Press and publication brief — unscrewed.lol";
    if (description) {
      description.content =
        "Verified facts, live marketplace outcomes, story angles, and reusable media assets for coverage of the fee-free U.S. barter project unscrewed.lol.";
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

  const metrics = [
    ["Members", stats?.members_total],
    ["Active listings", stats?.listings_active],
    ["Two-sided conversations", stats?.two_sided_conversations],
    ["Completed trades", stats?.completed_trades],
  ] as const;

  return (
    <div className="pb-24">
      <section className="border-b border-surface-200 bg-gradient-to-br from-accent-sky/45 via-surface-50 to-brand-50">
        <Container size="lg" className="py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Press and publication brief
          </p>
          <h1 className="display mt-3 max-w-4xl text-balance text-5xl leading-[1.02] text-ink-900 sm:text-6xl">
            A barter marketplace that publishes the zeroes.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-600 sm:text-lg">
            unscrewed.lol is a fee-free U.S. marketplace for exchanging useful
            goods and skills directly. It is based in Chandler, Arizona, open
            nationally, and deliberately reports completed exchanges instead
            of presenting visits or signups as community impact.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/contact?intent=press" className="btn-brand">
              Contact the project
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to="/public-benefit" className="btn-outline">
              Verify the commitments
            </Link>
          </div>
        </Container>
      </section>

      <Container size="lg" className="mt-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(([label, value]) => (
            <div key={label} className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {label}
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-900">
                {value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          “Public benefit” describes the project’s operating intention and
          accountability standard. It is not a claim of nonprofit status,
          public-benefit-corporation status, university affiliation, or
          endorsement by a reuse organization.
        </p>
      </Container>

      <Container size="lg" className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Live evidence
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink-900">
              Quote these numbers only with their denominator
            </h2>
          </div>
          <Link
            to="/community"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            Open the public evidence page
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-500">
          These figures come from the production marketplace and may change.
          A conversation requires replies from both people. A completed trade
          requires a signed agreement and separate confirmation from both
          participants that the exchange happened.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-ink-900 p-5 text-white">
              <p className="text-xs font-medium text-white/60">{label}</p>
              <p className="mt-2 text-4xl font-bold tabular-nums">
                {value === undefined ? "—" : value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          Last production update:{" "}
          {stats?.updated_at
            ? new Date(stats.updated_at).toLocaleString()
            : "loading or temporarily unavailable"}
          . Please recheck immediately before publication.
        </p>
      </Container>

      <Container size="lg" className="mt-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
          Current editorial angles
        </p>
        <h2 className="mt-2 text-3xl font-bold text-ink-900">
          Three stories that can be evaluated now
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StoryCard
            icon={<Recycle className="h-5 w-5" />}
            title="The smallest honest reuse loop"
            body="A 2–5-person field test asks whether direct barter can complement free stores, repair groups, and municipal reuse work without pretending an empty network is liquid."
            to="/movement#organize"
            action="Review the organizer test"
          />
          <StoryCard
            icon={<Code2 className="h-5 w-5" />}
            title="Engineering outcome semantics"
            body="The technical case study covers scope-aware attribution, agreement versus completion, D1 and Durable Object authority, and privacy-minimal alerts."
            to="/blog/building-a-marketplace-where-zero-is-a-feature"
            action="Read the architecture note"
          />
          <StoryCard
            icon={<MapPin className="h-5 w-5" />}
            title="National access, local proof"
            body="The marketplace is available nationwide, while local supply is reported only where it exists. One remote listing is not relabeled as neighborhood liquidity."
            to="/community"
            action="Inspect the live map"
          />
        </div>
      </Container>

      <Container size="lg" className="mt-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Reusable assets
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink-900">
              Download, don’t screenshot
            </h2>
            <div className="mt-6 grid gap-3">
              <AssetLink
                href="/og.png"
                title="General social image"
                detail="1200 × 630 PNG"
                download="unscrewed-general.png"
              />
              <AssetLink
                href="/movement-og.png"
                title="National barter-movement image"
                detail="1200 × 630 PNG"
                download="unscrewed-barter-movement.png"
              />
              <AssetLink
                href="/barter-movement-short.mp4"
                title="24-second vertical explainer"
                detail="MP4 with separate English captions"
                download="unscrewed-barter-movement.mp4"
              />
              <AssetLink
                href="/barter-movement-short.vtt"
                title="English captions"
                detail="WebVTT captions for the vertical explainer"
                download="unscrewed-barter-movement-en.vtt"
              />
              <AssetLink
                href="/one-honest-barter-circle-test.pdf"
                title="Organizer field sheet"
                detail="One-page PDF"
                download="one-honest-barter-circle-test.pdf"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-surface-200 bg-white p-7 shadow-card sm:p-9">
            <FileText className="h-6 w-6 text-brand-700" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold text-ink-900">
              Verification notes
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-500">
              <li>
                Core barter—browsing, posting, proposing, negotiating, and
                signing a basic trade—has no platform fee.
              </li>
              <li>
                The project does not claim nonprofit status, institutional
                affiliation, funding, endorsement, or established traction.
              </li>
              <li>
                Public map locations are thresholded, coarsened to ZIP-3, and
                rounded; private messages and exact addresses are not public
                metrics.
              </li>
              <li>
                The architecture article discloses AI assistance and was
                checked against production code, deployment, and live counts.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/safety" className="btn-outline">
                Safety rules
              </Link>
              <Link to="/tos" className="btn-outline">
                Terms
              </Link>
              <Link to="/contact?intent=press" className="btn-brand">
                Request an interview
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}

function StoryCard({
  icon,
  title,
  body,
  to,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  to: string;
  action: string;
}) {
  return (
    <article className="card flex flex-col p-6">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{body}</p>
      <Link
        to={to}
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
      >
        {action}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  );
}

function AssetLink({
  href,
  title,
  detail,
  download,
}: {
  href: string;
  title: string;
  detail: string;
  download: string;
}) {
  return (
    <a
      href={href}
      download={download}
      className="flex items-center justify-between gap-4 rounded-2xl border border-surface-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-card"
    >
      <span>
        <span className="block text-sm font-semibold text-ink-900">{title}</span>
        <span className="mt-1 block text-xs text-ink-400">{detail}</span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
    </a>
  );
}
