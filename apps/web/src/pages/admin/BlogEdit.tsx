import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, Save, Send, Undo2 } from "lucide-react";
import { slugify } from "@unscrewed/shared";
import { Container } from "../../ui/Container.js";
import { api } from "../../lib/api.js";

interface AdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyMd: string;
  heroImageUrl: string | null;
  status: "draft" | "published";
}

export default function BlogEdit() {
  const nav = useNavigate();
  const { id } = useParams();
  const isNew = !id;

  const [loaded, setLoaded] = useState(isNew);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<AdminPost>(`/blog/admin/${id}`)
      .then((p) => {
        setSlug(p.slug);
        setSlugTouched(true);
        setTitle(p.title);
        setExcerpt(p.excerpt ?? "");
        setBodyMd(p.bodyMd);
        setHeroImageUrl(p.heroImageUrl ?? "");
        setStatus(p.status);
        setLoaded(true);
      })
      .catch((e) =>
        setError(e?.body?.error ?? e?.message ?? "Failed to load post")
      );
  }, [id]);

  // Auto-derive slug from title UNLESS the user manually edited it.
  useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  async function save(publishNow: boolean) {
    setError(null);
    if (title.trim().length < 2) {
      setError("Title needs at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      setError(
        "Slug must be lowercase letters and digits, separated by hyphens."
      );
      return;
    }
    if (bodyMd.trim().length < 1) {
      setError("Body is empty.");
      return;
    }
    setBusy(true);
    try {
      const nextStatus: "draft" | "published" = publishNow
        ? "published"
        : status;
      const body = {
        slug,
        title: title.trim(),
        excerpt: excerpt.trim() || undefined,
        bodyMd,
        heroImageUrl: heroImageUrl.trim() || null,
        status: nextStatus,
      };
      if (isNew) {
        const r = await api<{ id: string; slug: string }>("/blog", {
          method: "POST",
          body: JSON.stringify(body),
        });
        nav(`/admin/blog/${r.id}/edit`, { replace: true });
      } else {
        await api(`/blog/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      setStatus(nextStatus);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 3000);
    } catch (e: any) {
      const code = e?.body?.error;
      setError(
        code === "slug_in_use"
          ? "That slug is already used by another post."
          : (e?.body?.issues?.[0]?.message ??
              e?.body?.error ??
              e?.message ??
              "Save failed")
      );
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <Container size="lg" className="py-10">
        <div className="card h-64 animate-pulse" />
      </Container>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-ink-900">
          {isNew ? "New post" : "Edit post"}
        </h1>
        <div className="flex items-center gap-2">
          {status === "published" && (
            <span className="chip-brand">published</span>
          )}
          {status === "draft" && (
            <span className="chip bg-amber-50 text-amber-800">draft</span>
          )}
          {savedFlash && <span className="chip-brand">✓ Saved</span>}
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="btn-ghost text-sm"
          >
            <Eye className="h-4 w-4" strokeWidth={2} />
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>

      {!preview ? (
        <div className="space-y-4">
          <div className="card p-5">
            <label className="block">
              <span className="label">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input mt-1 text-lg font-semibold"
                placeholder="A confident, curious title"
              />
            </label>
            <label className="mt-3 block">
              <span className="label">Slug</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-ink-400">/blog/</span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase());
                    setSlugTouched(true);
                  }}
                  className="input font-mono"
                  placeholder="my-first-post"
                />
                {slugTouched && title && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlug(slugify(title));
                      setSlugTouched(false);
                    }}
                    className="btn-ghost text-xs"
                    title="Re-generate slug from title"
                  >
                    <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Auto
                  </button>
                )}
              </div>
            </label>
            <label className="mt-3 block">
              <span className="label">Excerpt (optional)</span>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                maxLength={500}
                className="input mt-1"
                placeholder="One or two sentences that show up in the list and previews."
              />
            </label>
            <label className="mt-3 block">
              <span className="label">Hero image URL (optional)</span>
              <input
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                className="input mt-1 font-mono text-sm"
                placeholder="https://example.com/image.jpg"
              />
            </label>
          </div>

          <div className="card p-5">
            <label className="block">
              <span className="label">Body (Markdown)</span>
              <textarea
                value={bodyMd}
                onChange={(e) => setBodyMd(e.target.value)}
                rows={22}
                className="input mt-1 font-mono text-sm leading-relaxed"
                placeholder={"## Section heading\n\nWrite in Markdown.\n\n- lists\n- links [like this](https://…)\n- **bold**, _italic_\n\n> block quotes are supported too\n"}
              />
              <p className="mt-1 text-xs text-ink-400">
                Supports GitHub-Flavored Markdown: tables, task lists, strikethrough, autolinks.
              </p>
            </label>
          </div>
        </div>
      ) : (
        <article className="card prose prose-neutral max-w-none p-6 sm:p-10">
          {heroImageUrl && (
            <img
              src={heroImageUrl}
              alt=""
              className="mb-6 aspect-[16/9] w-full rounded-2xl object-cover"
            />
          )}
          <h1>{title || "(untitled)"}</h1>
          {excerpt && <p className="text-ink-500">{excerpt}</p>}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {bodyMd || "*Empty body — write something in Edit mode.*"}
          </ReactMarkdown>
        </article>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-surface-200 bg-surface-50/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={busy}
            className="btn-outline"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {status === "published" ? "Save (stays published)" : "Save draft"}
          </button>
          {status !== "published" && (
            <button
              type="button"
              onClick={() => save(true)}
              disabled={busy}
              className="btn-brand"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
              {busy ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
