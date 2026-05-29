import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-sand-200 bg-gradient-to-b from-brand-50 to-sand-50">
        <Container size="xl" className="py-10 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
              Trade what you have for what you need.
            </h1>
            <p className="mt-4 text-lg text-ink-500">
              A barter marketplace for your neighborhood — goods, services,
              skills. No fees. No middleman. Just a fair swap.
            </p>
            <div className="mt-8">
              <SearchBar size="lg" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-500">
              <span>Popular:</span>
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
      <Container size="xl" className="mt-10">
        <SectionHeader
          title="Browse goods"
          subtitle="Things you can swap for other things"
          linkTo="/browse?kind=good"
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {goods.map((c) => (
            <CategoryTile key={c.slug} {...c} />
          ))}
        </div>
      </Container>

      {/* Services categories */}
      <Container size="xl" className="mt-12">
        <SectionHeader
          title="Browse services"
          subtitle="Time and skills — labor, expertise, helping hands"
          linkTo="/browse?kind=service"
        />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {services.map((c) => (
            <CategoryTile key={c.slug} {...c} />
          ))}
        </div>
      </Container>

      {/* Trending */}
      <Container size="xl" className="mt-14">
        <SectionHeader
          title="Trades near you"
          subtitle="The latest listings within your map view"
          linkTo="/browse"
        />
        {trending.length === 0 ? (
          <div className="mt-4 card p-8 text-center text-ink-500">
            <div className="text-3xl">🌱</div>
            <p className="mt-2">
              No trades posted yet — be the first.{" "}
              <Link to="/post" className="text-brand-700 underline">
                Post a trade
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        )}
      </Container>

      {/* How it works */}
      <Container size="lg" className="mt-16">
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-ink-900">How unscrewed works</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Step
              n={1}
              title="Post or browse"
              body="List what you have. Or browse what others have nearby."
            />
            <Step
              n={2}
              title="Negotiate"
              body="Chat with the other party. Agree on what each side gives."
            />
            <Step
              n={3}
              title="Sign and trade"
              body="Both parties sign a simple social contract. Meet and swap."
            />
          </div>
          <p className="mt-6 text-xs text-ink-500">
            unscrewed.lol is not a party to your trade. Read the{" "}
            <Link to="/tos" className="underline">
              Terms
            </Link>{" "}
            before you trade.
          </p>
        </div>
      </Container>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  linkTo,
}: {
  title: string;
  subtitle: string;
  linkTo: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>
      </div>
      <Link
        to={linkTo}
        className="hidden text-sm font-medium text-brand-700 hover:underline sm:inline"
      >
        See all →
      </Link>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div>
      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
        {n}
      </div>
      <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-500">{body}</p>
    </div>
  );
}
