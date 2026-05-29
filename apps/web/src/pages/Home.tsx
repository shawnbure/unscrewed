import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  MessageSquare,
  FileSignature,
  Hand,
  TrendingDown,
  Users,
  Building2,
} from "lucide-react";
import { Container } from "../ui/Container.js";
import { SearchBar } from "../ui/SearchBar.js";
import { CategoryTile, CATEGORIES } from "../ui/CategoryTile.js";
import { ListingCard, type ListingCardData } from "../ui/ListingCard.js";
import { api } from "../lib/api.js";

export default function Home() {
  const [trending, setTrending] = useState<ListingCardData[]>([]);

  useEffect(() => {
    api<{ items: ListingCardData[] }>("/listings?limit=12")
      .then((r) => setTrending(r.items))
      .catch(() => setTrending([]));
  }, []);

  const goods = CATEGORIES.filter(
    (c) => c.kind === "good" || c.kind === "both"
  );
  const services = CATEGORIES.filter((c) => c.kind === "service");

  return (
    <div className="pb-24">
      {/* Hero — opinionated, anti-corporate-skim manifesto */}
      <section className="relative overflow-hidden border-b border-surface-200">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/80 via-surface-50 to-surface-50" />
        <Container size="xl" className="pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-700 shadow-card ring-1 ring-surface-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Community-owned · No fees · No middleman
            </span>
            <h1 className="display mt-5 text-balance text-5xl leading-[1.02] text-ink-900 sm:text-6xl">
              Inflation is rigged.{" "}
              <span className="text-brand-600">Trade isn’t.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-ink-500 sm:text-lg">
              Corporations are posting record profits while your paycheck buys
              less every month. unscrewed.lol is a neighborhood barter
              marketplace — swap goods and services with the people around you.
              No app fees, no payment processors, no corporate skim.
            </p>
            <div className="mx-auto mt-8 max-w-xl">
              <SearchBar size="lg" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-500">
              <span>Try:</span>
              {[
                "lawn care",
                "guitar",
                "tutoring",
                "tools",
                "babysitting",
                "bike",
              ].map((tag) => (
                <Link
                  key={tag}
                  to={`/browse?q=${encodeURIComponent(tag)}`}
                  className="chip hover:bg-brand-50 hover:text-brand-700"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Manifesto: why this exists */}
      <section className="border-b border-surface-200 bg-white">
        <Container size="xl" className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Why we built this
            </p>
            <h2 className="display mt-2 text-balance text-3xl text-ink-900 sm:text-4xl">
              The economy is squeezing all of us.{" "}
              <span className="text-brand-600">
                Our communities can squeeze back.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base text-ink-500">
              The dollar buys less. Rents climb. Subscriptions multiply. Every
              transaction has a corporate layer skimming a cut. Meanwhile, the
              people next door have skills you need, and you have things they
              need. Trade is older than money — and it still works.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
            <ManifestoCard
              icon={<TrendingDown className="h-5 w-5" strokeWidth={2} />}
              title="Inflation eats your paycheck"
              body="Real wages have been flat for a generation. Groceries, rent, and basics keep climbing. A trade doesn't care what the dollar is worth."
            />
            <ManifestoCard
              icon={<Building2 className="h-5 w-5" strokeWidth={2} />}
              title="Middlemen take a cut of everything"
              body="Marketplaces, payment processors, ad networks, apps — each transaction passes through hands that produce nothing. unscrewed takes nothing."
            />
            <ManifestoCard
              icon={<Users className="h-5 w-5" strokeWidth={2} />}
              title="Neighbors > corporations"
              body="Your community already has what you need. The work of building a real, local trade network is how we get unscrewed together."
            />
          </div>
        </Container>
      </section>

      {/* Goods categories */}
      <Container size="xl" className="mt-14">
        <SectionHeader
          eyebrow="Goods"
          title="Things to swap"
          linkTo="/browse?kind=good"
        />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {goods.map((c) => (
            <CategoryTile key={c.slug} {...c} />
          ))}
        </div>
      </Container>

      {/* Services categories */}
      <Container size="xl" className="mt-14">
        <SectionHeader
          eyebrow="Services"
          title="Time, skills & helping hands"
          linkTo="/browse?kind=service"
        />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {services.map((c) => (
            <CategoryTile key={c.slug} {...c} />
          ))}
        </div>
      </Container>

      {/* Trending */}
      <Container size="xl" className="mt-16">
        <SectionHeader
          eyebrow="Recent"
          title="Trades near you"
          linkTo="/browse"
        />
        {trending.length === 0 ? (
          <div className="card mt-5 flex flex-col items-center p-10 text-center text-ink-500">
            <Hand className="h-10 w-10 text-brand-400" strokeWidth={1.5} />
            <p className="mt-3 text-base">
              No trades posted yet — be the first one to start.
            </p>
            <Link to="/post" className="btn-brand mt-4">
              Post a trade <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        )}
      </Container>

      {/* How it works */}
      <Container size="lg" className="mt-20">
        <div className="card p-8 sm:p-12">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              How it works
            </p>
            <h2 className="display mt-2 text-3xl text-ink-900">
              Three steps. No money. No fees.
            </h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Step
              n={1}
              icon={<Hand className="h-5 w-5" strokeWidth={2} />}
              title="Post or browse"
              body="List what you have. Or see what your neighbors have nearby."
            />
            <Step
              n={2}
              icon={<MessageSquare className="h-5 w-5" strokeWidth={2} />}
              title="Negotiate"
              body="Chat with the other party. Agree on terms that work for both of you."
            />
            <Step
              n={3}
              icon={<FileSignature className="h-5 w-5" strokeWidth={2} />}
              title="Sign and trade"
              body="Both parties sign a simple social contract. Meet and swap."
            />
          </div>
          <p className="mt-8 text-center text-xs text-ink-500">
            unscrewed.lol is not a party to your trade.{" "}
            <Link to="/tos" className="underline hover:text-ink-900">
              Read the Terms
            </Link>{" "}
            before you trade.
          </p>
        </div>
      </Container>

      {/* Closing CTA */}
      <Container size="lg" className="mt-16">
        <div className="rounded-3xl bg-ink-900 p-8 text-center text-white sm:p-12">
          <h2 className="display text-3xl text-balance sm:text-4xl">
            Stop renting your life from corporations.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
            Post one thing you don't need anymore. Find one thing you do. That's
            how we start.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-surface-100"
            >
              Join the trade
            </Link>
            <Link
              to="/browse"
              className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Browse trades
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

function ManifestoCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-5 text-left">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-700">
        {icon}
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-500">{body}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  linkTo,
}: {
  eyebrow: string;
  title: string;
  linkTo: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
          {eyebrow}
        </p>
        <h2 className="display mt-1 text-2xl text-ink-900 sm:text-3xl">
          {title}
        </h2>
      </div>
      <Link
        to={linkTo}
        className="hidden items-center gap-1 text-sm font-medium text-ink-700 hover:text-ink-900 sm:inline-flex"
      >
        See all <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-ink-900">
        <span className="mr-2 font-mono text-sm text-ink-400">0{n}</span>
        {title}
      </h3>
      <p className="mt-1 text-sm text-ink-500">{body}</p>
    </div>
  );
}
