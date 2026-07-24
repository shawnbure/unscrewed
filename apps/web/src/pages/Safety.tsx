import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  Flag,
  MapPin,
  MessageSquare,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Container } from "../ui/Container.js";

const PAGE_DESCRIPTION =
  "Practical safety, privacy, scam-prevention, meetup, and reporting guidance for trading on unscrewed.lol.";

export default function SafetyPage() {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const previousDescription = description?.content;

    document.title = "Trade safely — unscrewed.lol";
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
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-50 via-surface-50 to-accent-lemon/35" />
        <Container size="lg" className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-card ring-1 ring-surface-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Safety is part of a fair trade
            </div>
            <h1 className="display mt-5 text-balance text-5xl leading-[1.02] text-ink-900 sm:text-6xl">
              Trade with a plan,
              <span className="block text-brand-600">not blind trust.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-lg">
              unscrewed helps neighbors find each other, negotiate, and keep a
              record. It does not inspect people, goods, services, or meeting
              places. You can pause or walk away at any point before exchanging.
            </p>
          </div>
        </Container>
      </section>

      <Container size="lg" className="mt-12">
        <div className="grid gap-4 md:grid-cols-2">
          <SafetyCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="Keep the plan in the conversation"
          >
            <ul className="space-y-2">
              <li>Agree on exactly what each person will provide.</li>
              <li>
                Keep important details in unscrewed chat so both people can
                review the same record.
              </li>
              <li>
                Never share passwords, sign-in codes, card or bank information,
                government ID numbers, or account-recovery answers.
              </li>
              <li>
                Pressure to leave the platform immediately is a reason to slow
                down, verify, or stop.
              </li>
            </ul>
          </SafetyCard>

          <SafetyCard
            icon={<MapPin className="h-5 w-5" />}
            title="Choose the meetup deliberately"
          >
            <ul className="space-y-2">
              <li>Meet in a public, well-lit place, preferably during daylight.</li>
              <li>
                Tell someone where you are going and when you expect to return;
                bring another person if that makes the exchange safer.
              </li>
              <li>
                Do not use a home address unless the trade truly requires it
                and you have independently decided the risk is acceptable.
              </li>
              <li>Leave if the person, item, location, or plan is not as agreed.</li>
            </ul>
            <a
              href="https://www.umass.edu/police/services"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              UMass community: review UMPD safety and escort services
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </SafetyCard>

          <SafetyCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Recognize scam-shaped requests"
          >
            <ul className="space-y-2">
              <li>
                Stop if someone turns a barter into an urgent request for
                money, a wire transfer, cryptocurrency, or gift-card numbers.
              </li>
              <li>
                Do not accept an overpayment, deposit a stranger&apos;s check,
                or send a supposed excess amount back.
              </li>
              <li>
                Verify claims of identity, ownership, credentials, or
                organizational affiliation independently.
              </li>
              <li>
                A complicated story is not evidence. Slow down and ask someone
                you trust to look at it.
              </li>
            </ul>
            <a
              href="https://consumer.ftc.gov/consumer-alerts/2023/02/whats-legit-whats-scam"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              Read the FTC&apos;s current scam warning signs
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </SafetyCard>

          <SafetyCard
            icon={<Eye className="h-5 w-5" />}
            title="Inspect before you exchange"
          >
            <ul className="space-y-2">
              <li>
                Test goods when practical and compare their condition with the
                listing before handing anything over.
              </li>
              <li>
                For services, agree on scope, time, supplies, access, and what
                counts as complete before work begins.
              </li>
              <li>
                Do not trade an item you suspect is stolen, recalled, unsafe,
                counterfeit, or legally restricted.
              </li>
              <li>
                A signed social contract records an agreement; it does not make
                an unsafe or illegal trade safe.
              </li>
            </ul>
          </SafetyCard>
        </div>
      </Container>

      <Container size="lg" className="mt-14">
        <section className="card overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-ink-900 p-7 text-white sm:p-9">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-300/15 text-brand-200">
                <UserRoundCheck className="h-5 w-5" />
              </div>
              <h2 className="display mt-5 text-3xl">What stays private?</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Privacy includes what the product withholds and what members
                choose not to reveal.
              </p>
            </div>
            <div className="p-7 sm:p-9">
              <ul className="space-y-4 text-sm leading-relaxed text-ink-600">
                <li>
                  <strong className="text-ink-900">Public map:</strong> listings
                  show the center of a coarse neighborhood cell, not the exact
                  coordinate you selected. A ZIP or postal code remains visible.
                </li>
                <li>
                  <strong className="text-ink-900">Stored location:</strong> the
                  selected coordinate is retained to support local matching but
                  is not returned by public listing endpoints.
                </li>
                <li>
                  <strong className="text-ink-900">Photos:</strong> listing
                  photos are public. Check for house numbers, faces, license
                  plates, mail, documents, or reflections before uploading.
                </li>
                <li>
                  <strong className="text-ink-900">Meetup details:</strong> share
                  the minimum needed, and share an exact location only after
                  both people agree on the trade and safety plan.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </Container>

      <Container size="lg" className="mt-14">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-7 sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-700">
                <Flag className="h-4 w-4" />
                Stop and report
              </div>
              <h2 className="display mt-2 text-3xl text-ink-900">
                You do not owe anyone a completed trade.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Use the Report action on a listing or beside a negotiation to
                flag scams, harassment, illegal activity, or other safety
                concerns. Reports are confidential. For behavior that cannot be
                reported in-product, email{" "}
                <a
                  href="mailto:help@unscrewed.lol"
                  className="font-semibold text-brand-700 underline"
                >
                  help@unscrewed.lol
                </a>
                . If anyone is in immediate danger, leave and contact the
                appropriate local emergency service.
              </p>
            </div>
            <Link
              to="/tos#prohibited"
              className="btn-outline shrink-0 border-red-300 bg-white text-red-800 hover:bg-red-100"
            >
              Prohibited trades
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}

function SafetyCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6 sm:p-7">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}
