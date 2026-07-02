// "Thoughts on making money :)"
//
// Public page listing the trust-stack proposals + community suggestions.
// Any account can vote (±1 or clear). Any account can submit new
// suggestions. Admins can move ideas through status states.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Users,
  Lightbulb,
  Send,
  ArrowRight,
} from "lucide-react";
import { Container } from "../ui/Container.js";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";

type IdeaKind = "trust_stack" | "community_suggestion";
type Status = "proposed" | "accepted" | "shipped" | "rejected";

interface Idea {
  id: string;
  kind: IdeaKind;
  title: string;
  description: string;
  price_hint: string | null;
  status: Status;
  submitted_by: string | null;
  submitter_name: string | null;
  votes_up: number;
  votes_down: number;
  date_created: number;
  my_vote: 1 | -1 | 0 | null;
}

export default function ThoughtsPage() {
  const { session, refresh } = useSession();
  const [items, setItems] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: Idea[] }>("/money-ideas");
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [trustStack, communitySuggestions] = useMemo(() => {
    const ts = items.filter((i) => i.kind === "trust_stack");
    const cs = items.filter((i) => i.kind === "community_suggestion");
    return [ts, cs];
  }, [items]);

  async function vote(idea: Idea, next: 1 | -1 | 0) {
    if (!session?.authenticated) {
      window.location.href = "/login";
      return;
    }
    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id !== idea.id
          ? i
          : optimisticVote(i, next)
      )
    );
    try {
      const r = await api<{
        votesUp: number;
        votesDown: number;
        myVote: 1 | -1 | 0;
      }>(`/money-ideas/${idea.id}/vote`, {
        method: "POST",
        body: JSON.stringify({ vote: next }),
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id !== idea.id
            ? i
            : {
                ...i,
                votes_up: r.votesUp,
                votes_down: r.votesDown,
                my_vote: r.myVote,
              }
        )
      );
    } catch {
      await load(); // rollback via reload
    }
  }

  async function setStatus(idea: Idea, status: Status) {
    await api(`/money-ideas/${idea.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="pb-24">
      <section className="border-b border-surface-200 bg-gradient-to-b from-brand-50/70 to-surface-50">
        <Container size="lg" className="py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            An open question
          </p>
          <h1 className="display mt-2 text-balance text-4xl leading-[1.05] text-ink-900 sm:text-5xl">
            Thoughts on making money{" "}
            <span className="text-brand-600">:)</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-ink-500 sm:text-lg">
            unscrewed will always be free to browse, post, negotiate, and sign
            social contracts. That's the whole point. But servers cost money,
            and if we go on hats-in-hand donations forever it's fragile. So
            here's a shared, work-in-progress thought about a{" "}
            <span className="font-semibold text-ink-900">
              paid "trust stack"
            </span>{" "}
            people can opt into for higher-stakes trades — a way to keep the
            lights on without becoming what we're fighting against.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-ink-500">
            Vote. Argue. Suggest better ideas. This is our shared question, not
            a spec. Nothing here is decided; nothing here is off the table.
          </p>
        </Container>
      </section>

      <Container size="lg" className="mt-12">
        <SectionHead
          icon={<Sparkles className="h-5 w-5" strokeWidth={2} />}
          eyebrow="Trust stack"
          title="What we're mulling over"
          body="Optional, opt-in services people can pay for on the trades where it matters. The basic marketplace stays free forever."
        />
        {loading ? (
          <SkeletonList />
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {trustStack.map((i) => (
              <IdeaCard
                key={i.id}
                idea={i}
                canVote={!!session?.authenticated}
                isAdmin={!!session?.isAdmin}
                onVote={vote}
                onStatus={setStatus}
              />
            ))}
          </ul>
        )}
      </Container>

      <Container size="lg" className="mt-16">
        <SectionHead
          icon={<Users className="h-5 w-5" strokeWidth={2} />}
          eyebrow="From the community"
          title="Ideas from other people"
          body="Someone here saw the trust stack and thought of something better. Vote them up, push back, riff on them."
        />
        {loading ? (
          <SkeletonList />
        ) : communitySuggestions.length === 0 ? (
          <div className="card mt-6 p-8 text-center text-ink-500">
            <Lightbulb className="mx-auto h-8 w-8 text-brand-400" strokeWidth={1.5} />
            <p className="mt-3">
              Nobody has suggested a new idea yet. Be the first.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {communitySuggestions.map((i) => (
              <IdeaCard
                key={i.id}
                idea={i}
                canVote={!!session?.authenticated}
                isAdmin={!!session?.isAdmin}
                onVote={vote}
                onStatus={setStatus}
              />
            ))}
          </ul>
        )}
      </Container>

      <Container size="lg" className="mt-16">
        <SuggestForm
          authed={!!session?.authenticated}
          onSubmitted={load}
        />
      </Container>
    </div>
  );
}

function optimisticVote(i: Idea, next: 1 | -1 | 0): Idea {
  const prev = i.my_vote ?? 0;
  let up = i.votes_up;
  let down = i.votes_down;
  if (prev === 1) up--;
  if (prev === -1) down--;
  if (next === 1) up++;
  if (next === -1) down++;
  return { ...i, votes_up: up, votes_down: down, my_vote: next };
}

function IdeaCard({
  idea,
  canVote,
  isAdmin,
  onVote,
  onStatus,
}: {
  idea: Idea;
  canVote: boolean;
  isAdmin: boolean;
  onVote: (i: Idea, v: 1 | -1 | 0) => void;
  onStatus: (i: Idea, s: Status) => void;
}) {
  const score = idea.votes_up - idea.votes_down;
  const myUp = idea.my_vote === 1;
  const myDown = idea.my_vote === -1;
  return (
    <li className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink-900">{idea.title}</h3>
          {idea.price_hint && (
            <p className="mt-0.5 text-xs font-medium text-brand-700">
              {idea.price_hint}
            </p>
          )}
        </div>
        <StatusPill status={idea.status} />
      </div>
      <p className="text-sm leading-relaxed text-ink-700">
        {idea.description}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onVote(idea, myUp ? 0 : 1)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              myUp
                ? "bg-brand-500 text-white"
                : "bg-surface-100 text-ink-700 hover:bg-surface-200"
            } ${canVote ? "" : "opacity-60"}`}
            aria-pressed={myUp}
            aria-label={myUp ? "Remove upvote" : "Upvote"}
            title={canVote ? "Upvote" : "Sign in to vote"}
          >
            <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.25} />
            {idea.votes_up}
          </button>
          <button
            type="button"
            onClick={() => onVote(idea, myDown ? 0 : -1)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              myDown
                ? "bg-red-500 text-white"
                : "bg-surface-100 text-ink-700 hover:bg-surface-200"
            } ${canVote ? "" : "opacity-60"}`}
            aria-pressed={myDown}
            aria-label={myDown ? "Remove downvote" : "Downvote"}
            title={canVote ? "Downvote" : "Sign in to vote"}
          >
            <ThumbsDown className="h-3.5 w-3.5" strokeWidth={2.25} />
            {idea.votes_down}
          </button>
          <span
            className={`ml-2 text-xs font-semibold ${score > 0 ? "text-brand-700" : score < 0 ? "text-red-700" : "text-ink-400"}`}
            aria-label="Net score"
          >
            {score > 0 ? "+" : ""}
            {score}
          </span>
        </div>
        <div className="text-xs text-ink-400">
          {idea.submitter_name ? (
            <span>
              Suggested by{" "}
              <span className="font-medium text-ink-700">
                {idea.submitter_name}
              </span>
            </span>
          ) : (
            <span>Team proposal</span>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-surface-200 pt-3 text-xs">
          <span className="text-ink-400">Admin:</span>
          {(["proposed", "accepted", "shipped", "rejected"] as Status[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatus(idea, s)}
                className={`rounded-lg px-2 py-1 font-medium ${
                  idea.status === s
                    ? "bg-ink-900 text-white"
                    : "bg-surface-100 text-ink-700 hover:bg-surface-200"
                }`}
              >
                {s}
              </button>
            )
          )}
        </div>
      )}
    </li>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    proposed: "bg-surface-100 text-ink-700",
    accepted: "bg-brand-50 text-brand-700",
    shipped: "bg-brand-500 text-white",
    rejected: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${map[status]}`}
    >
      {status}
    </span>
  );
}

function SectionHead({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-700">
        {icon}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-brand-700">
        {eyebrow}
      </p>
      <h2 className="display mt-1 text-2xl text-ink-900 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">{body}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="card h-40 animate-pulse" />
      ))}
    </ul>
  );
}

function SuggestForm({
  authed,
  onSubmitted,
}: {
  authed: boolean;
  onSubmitted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceHint, setPriceHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!authed) {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    try {
      await api("/money-ideas", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          priceHint: priceHint || undefined,
        }),
      });
      setTitle("");
      setDescription("");
      setPriceHint("");
      setDone(true);
      onSubmitted();
      setTimeout(() => setDone(false), 4000);
    } catch (e: any) {
      setError(
        e?.body?.issues?.[0]?.message ??
          e?.body?.error ??
          e?.message ??
          "Could not submit"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-700">
          <Lightbulb className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-ink-900">
            Have a better idea?
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Suggest a way for unscrewed to fund itself that keeps the mission
            intact. Anything — new services, new partners, new pricing shapes,
            or a reason to kill one of the ideas above.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block">
          <span className="label">Idea</span>
          <input
            required
            minLength={4}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input mt-1"
            placeholder="A one-line pitch. e.g. Pay-what-you-can annual membership"
          />
        </label>
        <label className="block">
          <span className="label">Details</span>
          <textarea
            required
            minLength={10}
            maxLength={4000}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input mt-1"
            placeholder="How would it work? Who pays? What's the tradeoff? Any risks?"
          />
        </label>
        <label className="block">
          <span className="label">Price hint (optional)</span>
          <input
            maxLength={60}
            value={priceHint}
            onChange={(e) => setPriceHint(e.target.value)}
            className="input mt-1"
            placeholder="$5/mo · Free · 2% of trade · one-time · etc."
          />
        </label>
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {done && (
          <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
            Thanks — your idea is up for a vote.
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-2">
          <p className="text-xs text-ink-400">
            {authed ? (
              "You'll be attached to this suggestion by display name."
            ) : (
              <>
                <Link to="/login" className="underline hover:text-ink-900">
                  Sign in
                </Link>{" "}
                to submit or vote.
              </>
            )}
          </p>
          <button
            type="submit"
            disabled={busy || !authed}
            className="btn-brand"
          >
            <Send className="h-4 w-4" strokeWidth={2.25} />
            {busy ? "Sending…" : "Submit"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
