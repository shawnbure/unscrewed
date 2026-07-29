import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, LifeBuoy, ShieldAlert } from "lucide-react";
import {
  SUPPORT_TOPIC_LABELS,
  type SupportTopic,
} from "@unscrewed/shared";
import Turnstile from "../components/Turnstile.js";
import { api } from "../lib/api.js";
import { getStoredAttribution } from "../lib/attribution.js";
import { Container } from "../ui/Container.js";

const TOPICS = Object.entries(SUPPORT_TOPIC_LABELS) as [
  SupportTopic,
  string,
][];

const ORGANIZER_MESSAGE = `I can help run a 2–5-person barter-circle test.

Location or community: [city, campus, neighborhood, or organization]
People I can invite: [rough number]
One genuine offer we could start with: [item or skill]
What I need from unscrewed: [feedback, setup help, or something else]`;

const PRESS_MESSAGE = `I am interested in covering or discussing unscrewed.lol.

Publication, program, or event: [name and public URL, if available]
What I am working on: [story, interview, newsletter, podcast, conference, or other]
Deadline and time zone: [date and time zone, or no deadline]
What I need: [interview, fact check, media asset, demo, or something else]`;

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const organizerIntent = searchParams.get("intent") === "organizer-pilot";
  const pressIntent = searchParams.get("intent") === "press";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<SupportTopic>(
    organizerIntent ? "organizer" : pressIntent ? "press" : "question"
  );
  const [message, setMessage] = useState(
    organizerIntent ? ORGANIZER_MESSAGE : pressIntent ? PRESS_MESSAGE : ""
  );
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = organizerIntent
      ? "Run a barter-circle pilot — unscrewed.lol"
      : pressIntent
        ? "Press inquiry — unscrewed.lol"
        : "Contact unscrewed.lol";
    return () => {
      document.title = previous;
    };
  }, [organizerIntent, pressIntent]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!turnstileToken) {
      setError("Please complete the bot check.");
      return;
    }
    if (
      (topic === "organizer" || topic === "press") &&
      /\[[^\]]+\]/.test(message)
    ) {
      setError("Please replace each bracketed prompt with a real answer.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ ok: true; requestId?: string }>("/support", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          topic,
          message,
          attribution: getStoredAttribution(),
          website,
          turnstileToken,
        }),
      });
      setRequestId(result.requestId ?? "received");
    } catch (e: any) {
      const code = e?.body?.error;
      setError(
        code === "rate_limited"
          ? "Too many requests were submitted from this connection. Please try again later."
          : code === "turnstile_failed"
            ? "The bot check could not be verified. Please try it again."
            : e?.body?.issues?.[0]?.message ??
              e?.message ??
              "Your request could not be submitted."
      );
    } finally {
      setBusy(false);
    }
  }

  if (requestId) {
    return (
      <Container size="sm" className="py-12">
        <section className="card p-8 text-center sm:p-10">
          <CheckCircle2
            className="mx-auto h-10 w-10 text-brand-600"
            strokeWidth={1.75}
          />
          <h1 className="mt-4 text-3xl font-bold text-ink-900">
            {topic === "organizer"
              ? "Your pilot request is in the private inbox."
              : topic === "press"
                ? "Your publication inquiry is in the private inbox."
                : "Your message is in the private support inbox."}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-500">
            A human can review it and reply to the email address you provided.
            This confirmation does not promise an immediate response.
          </p>
          {requestId !== "received" && (
            <p className="mt-4 text-xs text-ink-400">
              Reference: <span className="font-mono">{requestId}</span>
            </p>
          )}
          <Link to="/" className="btn-brand mt-6">
            Return home
          </Link>
        </section>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-10">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <h1 className="display mt-4 text-4xl text-ink-900">
            {organizerIntent
              ? "Run one honest barter-circle test."
              : pressIntent
                ? "Verify the story with a human."
                : "Contact a human."}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
            {organizerIntent
              ? "Tell us where you can gather two to five real people and the first genuine offer they could test. This is a small learning pilot—not a promise that a local marketplace already exists."
              : pressIntent
                ? "Share the publication, program, deadline, and exact fact, interview, asset, or demonstration you need. The live numbers and public source pages remain the evidence of record."
                : "Ask about the site, an account, a community partnership, or share blunt feedback. Your message and reply address stay private to the operator and are never shown on a listing or profile."}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">This is not emergency support.</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                  If someone is in immediate danger, contact local emergency
                  services. For prohibited content or a specific trade, use
                  the confidential Report action on that listing or
                  negotiation.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-ink-400">
            Read the <Link to="/safety" className="underline">Safety guide</Link>{" "}
            and <Link to="/tos" className="underline">Terms</Link>. Submitting
            this form creates a private support record containing the name,
            email, topic, and message you enter. We do not store your IP
            address with the request. If you arrived through a campaign link,
            the request also stores that link’s source, medium, and campaign
            labels. Resolved and spam requests are removed after one year.
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                autoComplete="name"
              />
            </Field>
            <Field label="Reply email">
              <input
                required
                type="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="email"
              />
            </Field>
          </div>

          <Field label="What is this about?">
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as SupportTopic)}
              className="input"
            >
              {TOPICS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Message">
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input"
              placeholder="What happened, what did you expect, and what would help?"
            />
            {topic === "organizer" && (
              <span className="mt-2 block text-xs leading-relaxed text-ink-500">
                Replace every bracketed prompt before sending. A named
                organizer and one genuine starting offer are more useful than
                a large audience estimate.
              </span>
            )}
            {topic === "press" && (
              <span className="mt-2 block text-xs leading-relaxed text-ink-500">
                Replace every bracketed prompt before sending. Include a real
                deadline only when one exists; the live press brief remains the
                source for current marketplace numbers.
              </span>
            )}
          </Field>

          <label className="hidden" aria-hidden="true">
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>

          <Turnstile
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />

          {error && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !turnstileToken}
            className="btn-primary w-full"
          >
            {busy ? "Sending…" : "Send private message"}
          </button>
        </form>
      </div>
    </Container>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
