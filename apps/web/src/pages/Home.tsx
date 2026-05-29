import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  MessageSquare,
  FileSignature,
  Hand,
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

  const goods = CATEGORIES.filter((c) => c.kind === "good" || c.kind === "both");
  const services = CATEGORIES.filter((c) => c.kind === "service");

  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-surface-200">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-surface-50 to-surface-50" />
        <Container size="xl" className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-700 shadow-card ring-1 ring-surface-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              No fees · No middleman · Just neighbors
            </span>
            <h1 className="display mt-5 text-5xl leading-[1.05] text-ink-900 sm:text-6xl">
              Trade what you have <br className="hidden sm:block" />
              for what you need.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-ink-500 sm:text-lg">
              A neighborhood barter marketplace. Goods, services, skills — swap
              direct with someone nearby, on terms you both agree to.
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
          <div className="mt-5 card flex flex-col items-center p-10 text-center text-ink-500">
            <Hand className="h-10 w-10 text-brand-400" strokeWidth={1.5} />
            <p className="mt-3 text-base">
              No trades posted yet — be the first.
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
              Three steps, no money.
            </h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Step
              n={1}
              icon={<Hand className="h-5 w-5" strokeWidth={2} />}
              title="Post or browse"
              body="List what you have. Or see what others have nearby."
            />
            <Step
              n={2}
              icon={<MessageSquare className="h-5 w-5" strokeWidth={2} />}
              title="Negotiate"
              body="Chat with the other party and agree on terms."
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
        <span className="mr-2 text-ink-400">0{n}</span>
        {title}
      </h3>
      <p className="mt-1 text-sm text-ink-500">{body}</p>
    </div>
  );
}
