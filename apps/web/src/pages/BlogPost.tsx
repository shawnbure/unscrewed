import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, Download } from "lucide-react";
import { Container } from "../ui/Container.js";
import { ReportButton } from "../ui/ReportButton.js";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";
import { ShareArticle } from "../ui/ShareArticle.js";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyMd: string;
  heroImageUrl: string | null;
  datePublished: number | null;
  dateModified: number;
  authorName: string | null;
}

// Rough reading-time estimate — 220 words/minute average.
function readingMinutes(md: string): number {
  const words = md.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const { session } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setNotFound(false);
    api<Post>(`/blog/${slug}`)
      .then(setPost)
      .catch((e) => {
        if (e?.status === 404) setNotFound(true);
      });
  }, [slug]);

  if (notFound) {
    return (
      <Container size="md" className="py-20 text-center">
        <p className="text-sm text-ink-500">Post not found.</p>
        <Link to="/blog" className="btn-brand mt-4 inline-flex">
          Back to blog
        </Link>
      </Container>
    );
  }
  if (!post) {
    return (
      <Container size="md" className="py-10">
        <div className="card h-64 animate-pulse" />
      </Container>
    );
  }

  return (
    <Container size="md" className="py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Back to blog
        </Link>
        {session?.isAdmin && (
          <Link
            to={`/admin/blog`}
            className="text-xs font-semibold uppercase tracking-wider text-amber-700 hover:text-amber-900"
          >
            Admin: manage posts
          </Link>
        )}
      </div>

      {post.heroImageUrl && (
        <img
          src={post.heroImageUrl}
          alt=""
          className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover shadow-card"
        />
      )}

      <header className="mt-8">
        <p className="text-xs text-ink-500">
          {post.authorName ?? "unscrewed team"}
          {post.datePublished
            ? ` · ${new Date(post.datePublished).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`
            : ""}
          {` · ${readingMinutes(post.bodyMd)} min read`}
        </p>
        <h1 className="display mt-2 text-balance text-4xl leading-[1.1] text-ink-900 sm:text-5xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-4 text-lg leading-relaxed text-ink-500">
            {post.excerpt}
          </p>
        )}
        <ShareArticle
          slug={post.slug}
          title={post.title}
          excerpt={post.excerpt}
        />
      </header>

      <article className="prose prose-neutral mt-8 max-w-none text-ink-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.bodyMd}</ReactMarkdown>
      </article>

      {post.slug === "how-to-start-a-neighborhood-barter-circle" && (
        <aside className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">
              Run one honest barter-circle test
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              Print the one-page organizer sheet to plan a 2–5-person pilot,
              record the furthest verified outcome, and capture why a match
              succeeds or fails.
            </p>
          </div>
          <a
            href="/one-honest-barter-circle-test.pdf"
            download
            className="btn-brand mt-4 inline-flex shrink-0 items-center gap-2 sm:mt-0"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download field sheet
          </a>
        </aside>
      )}

      <div className="mt-8 flex justify-end border-t border-surface-200 pt-4">
        <ReportButton targetType="blog_post" targetId={post.id} variant="link" />
      </div>
    </Container>
  );
}
