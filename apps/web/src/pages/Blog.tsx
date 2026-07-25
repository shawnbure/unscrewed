import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, Rss } from "lucide-react";
import { Container } from "../ui/Container.js";
import { api } from "../lib/api.js";

interface PostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  datePublished: number | null;
  authorName: string | null;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: PostSummary[] }>("/blog")
      .then((r) => setPosts(r.items))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden border-b border-surface-200">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-surface-50 to-surface-50" />
        <Container size="lg" className="py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            The blog
          </p>
          <h1 className="display mt-2 text-balance text-4xl leading-[1.05] text-ink-900 sm:text-5xl">
            Notes from the barter beat.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-ink-500 sm:text-lg">
            Thinking out loud about community, money, trust, and what we're
            building. New posts are rare on purpose.
          </p>
          <a
            href="/blog/feed.xml"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
          >
            <Rss className="h-4 w-4" strokeWidth={2} />
            Follow the public Atom feed
          </a>
        </Container>
      </section>

      <Container size="lg" className="mt-10">
        {loading ? (
          <ul className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="card h-40 animate-pulse" />
            ))}
          </ul>
        ) : posts.length === 0 ? (
          <div className="card flex flex-col items-center p-10 text-center text-ink-500">
            <BookOpen className="h-10 w-10 text-brand-400" strokeWidth={1.5} />
            <p className="mt-3">No posts yet. Check back soon.</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link
                  to={`/blog/${p.slug}`}
                  className="card group flex flex-col gap-4 overflow-hidden p-5 transition-shadow hover:shadow-pop sm:flex-row sm:items-center sm:p-6"
                >
                  {p.heroImageUrl && (
                    <img
                      src={p.heroImageUrl}
                      alt=""
                      loading="lazy"
                      className="h-40 w-full shrink-0 rounded-xl object-cover sm:h-32 sm:w-48"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-ink-900 group-hover:text-brand-700 sm:text-2xl">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="mt-1.5 line-clamp-3 text-sm text-ink-500 sm:text-base">
                        {p.excerpt}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-ink-400">
                      {p.authorName ?? "unscrewed team"}
                      {p.datePublished
                        ? ` · ${new Date(p.datePublished).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-ink-300 group-hover:text-ink-700 sm:block" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
