import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Eye,
  Handshake,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getStats, type StatsPayload } from "../lib/stats.js";
import { Container } from "../ui/Container.js";

export default function PublicBenefitPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const previousDescription = description?.content;
    document.title = "Public-benefit commitments — unscrewed.lol";
    if (description) {
      description.content =
        "Testable public-benefit commitments and live marketplace outcomes for unscrewed.lol: core barter stays free, measurement stays honest, and member privacy comes first.";
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

  const evidence = [
    {
      label: "Members",
      value: stats?.members_total,
      detail: "Active, non-archived accounts",
    },
    {
      label: "Active listings",
      value: stats?.listings_active,
      detail: "Real offers currently available",
    },
    {
      label: "Two-sided conversations",
      value: stats?.two_sided_conversations,
      detail: "Threads where both people replied",
    },
    {
      label: "Signed trades",
      value: stats?.completed_trades,
      detail: "Agreements signed by both people",
    },
  ];

  return (
    <div className="pb-24">
      <section className="border-b border-surface-200 bg-gradient-to-br from-brand-50 via-surface-50 to-accent-lemon/35">
        <Container size="lg" className="py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Public-benefit operating commitments
          </p>
          <h1 className="display mt-3 max-w-4xl text-balance text-5xl leading-[1.02] text-ink-900 sm:text-6xl">
            Public benefit should be testable.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-600 sm:text-lg">
            unscrewed exists to help nearby people keep useful goods, skills,
            time, and value circulating without a platform taking a cut. The
            commitments and live outcomes below are the standard partners and
            members should hold the project to.
          </p>
          <div className="mt-7 rounded-2xl border border-surface-200 bg-white/80 p-5 text-sm leading-relaxed text-ink-600 shadow-card">
            <strong className="text-ink-900">Status:</strong> unscrewed is an
            independent community project. “Public benefit” describes its
            operating intention and accountability standard; it is not a claim
            that the project is a nonprofit, public-benefit corporation, or
            affiliated with a university or reuse organization.
          </div>
        </Container>
      </section>

      <Container size="lg" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Live public evidence
            </p>
            <h2 className="mt-2 text-3xl font-bold text-ink-900">
              Outcomes, including the zeroes
            </h2>
          </div>
          <Link
            to="/community"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            See the privacy-protected community map
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-500">
          Signups alone do not prove usefulness. A conversation counts only
          after both people reply; a completed trade counts only after both
          people sign an agreement.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {evidence.map((metric) => (
            <div key={metric.label} className="card p-5">
              <p className="text-sm font-medium text-ink-600">{metric.label}</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-ink-900">
                {metric.value === undefined
                  ? "—"
                  : metric.value.toLocaleString()}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-400">
                {metric.detail}
              </p>
            </div>
          ))}
        </div>
      </Container>

      <Container size="lg" className="mt-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
          The commitments
        </p>
        <h2 className="mt-2 text-3xl font-bold text-ink-900">
          What should remain true as the project grows
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Commitment
            icon={<CircleDollarSign className="h-5 w-5" />}
            title="Core barter stays free"
            body="Browsing, posting, proposing, negotiating, and signing a basic trade carry no platform fee. Any future optional service must be separate, clearly priced, and explicitly chosen."
          />
          <Commitment
            icon={<BarChart3 className="h-5 w-5" />}
            title="Useful activity beats vanity"
            body="The project reports real listings, replies from both sides, and signed trades. Clicks, copied links, and raw signup counts are never presented as completed community benefit."
          />
          <Commitment
            icon={<MapPin className="h-5 w-5" />}
            title="Location is coarsened"
            body="Public community areas require multiple members, expose only a broad ZIP-3 region, and use rounded marker coordinates. A member’s home ZIP and stored location stay private."
          />
          <Commitment
            icon={<Eye className="h-5 w-5" />}
            title="Measurement stays bounded"
            body="Campaign measurement is first-party and anonymous before signup. It records source-level outcomes, not cross-site behavior, private messages, exact addresses, or a recipient’s email-open history."
          />
          <Commitment
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No fake supply or forced growth"
            body="The project does not manufacture listings, accounts, visits, or trades. Invitations should go to one plausible person, respect community rules, and stop after a clear decline."
          />
          <Commitment
            icon={<Handshake className="h-5 w-5" />}
            title="Partners keep an exit"
            body="A pilot should start small, disclose that it is independent, measure local outcomes, and stop or change course if it does not create useful listings and fair exchanges."
          />
        </div>
      </Container>

      <Container size="lg" className="mt-16">
        <section className="rounded-3xl bg-ink-900 p-8 text-white sm:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Users className="h-6 w-6 text-brand-300" />
              <h2 className="display mt-4 text-3xl text-white sm:text-4xl">
                Evaluate the project, don’t endorse it blindly.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                Review the safety rules, legal terms, live numbers, and actual
                local inventory. Questions, criticism, and stop conditions are
                part of a responsible pilot.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/safety"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-surface-100"
              >
                Review safety
              </Link>
              <Link
                to="/contact"
                className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ask a question
              </Link>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-xs text-white/60">
            <Link to="/tos" className="hover:text-white">
              Terms and enforcement
            </Link>
            <Link to="/thoughts" className="hover:text-white">
              Funding discussion
            </Link>
            <Link to="/community" className="hover:text-white">
              Live community evidence
            </Link>
          </div>
        </section>
      </Container>
    </div>
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
    <article className="card p-6">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>
    </article>
  );
}
