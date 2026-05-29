import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  FileSignature,
  Sparkles,
  X as XIcon,
  ShieldCheck,
} from "lucide-react";
import { Container } from "../ui/Container.js";
import { api } from "../lib/api.js";

interface Message {
  id: string;
  senderUserId: string;
  body: string;
  dateCreated: number;
}

interface Negotiation {
  id: string;
  listingId: string;
  listerUserId: string;
  requesterUserId: string;
  offering: string;
  status: string;
}

interface Contract {
  id: string;
  negotiationId: string;
  listingId: string;
  partyAUserId: string;
  partyBUserId: string;
  termsJson: string;
  status: "draft" | "awaiting_signatures" | "signed" | "cancelled";
  partyASignedName: string | null;
  partyASignedAt: number | null;
  partyBSignedName: string | null;
  partyBSignedAt: number | null;
  dateCreated: number;
}

interface ContractTerms {
  whatPartyAGives: string;
  whatPartyBGives: string;
  meetupLocation?: string;
  meetupAt?: string;
  conditions?: string;
}

export default function NegotiationPage() {
  const { id } = useParams();
  const [me, setMe] = useState<{ id: string; displayName: string } | null>(null);
  const [data, setData] = useState<{
    negotiation: Negotiation;
    messages: Message[];
    contracts: Contract[];
  } | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    if (!id) return;
    const r = await api<any>(`/negotiations/${id}`);
    setData(r);
  }

  useEffect(() => {
    api<{ id: string; displayName: string }>("/me")
      .then((r) => setMe(r))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    load().catch(console.error);
    try {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const host =
        location.hostname === "localhost" || location.hostname === "127.0.0.1"
          ? `${location.host}/api`
          : "api.unscrewed.lol";
      const ws = new WebSocket(`${proto}://${host}/negotiations/${id}/ws`);
      wsRef.current = ws;
      ws.onmessage = () => load();
    } catch {
      /* ws optional */
    }
    return () => wsRef.current?.close();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api(`/negotiations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setBody("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return (
      <Container size="md" className="py-10">
        <div className="card h-72 animate-pulse" />
      </Container>
    );

  const { negotiation: n, messages } = data;
  // The "active" contract is the most recent non-cancelled one.
  const active =
    [...data.contracts]
      .sort((a, b) => b.dateCreated - a.dateCreated)
      .find((c) => c.status !== "cancelled") ?? null;

  return (
    <Container size="md" className="py-6">
      <Link to="/browse" className="text-sm text-ink-500 hover:text-ink-900">
        ← Browse
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
        {/* Chat column */}
        <section className="card flex h-[70vh] flex-col">
          <header className="border-b border-surface-200 px-4 py-3">
            <h1 className="text-lg font-bold text-ink-900">Negotiation</h1>
            <p className="text-xs text-ink-500">
              <Link
                to={`/listing/${n.listingId}`}
                className="text-brand-700 hover:underline"
              >
                View listing
              </Link>{" "}
              · status: {n.status}
            </p>
          </header>
          <ul className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <li className="py-12 text-center text-sm text-ink-400">
                No messages yet — say hi.
              </li>
            )}
            {messages.map((m) => {
              const mine = me && m.senderUserId === me.id;
              return (
                <li
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      mine
                        ? "bg-ink-900 text-white"
                        : "bg-surface-100 text-ink-900"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                    <div
                      className={`mt-0.5 text-[10px] ${mine ? "text-white/60" : "text-ink-400"}`}
                    >
                      {new Date(m.dateCreated).toLocaleString()}
                    </div>
                  </div>
                </li>
              );
            })}
            <div ref={bottomRef} />
          </ul>
          <form
            onSubmit={send}
            className="flex items-center gap-2 border-t border-surface-200 p-3"
          >
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message…"
              className="input flex-1"
            />
            <button type="submit" disabled={busy} className="btn-primary">
              Send
            </button>
          </form>
        </section>

        {/* Sidebar: their offer + contract */}
        <aside className="space-y-3">
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Their offer
            </h3>
            <p className="mt-1 text-sm text-ink-700">{n.offering}</p>
          </div>

          {/* Contract card */}
          {active ? (
            <ContractCard
              contract={active}
              me={me}
              negotiation={n}
              onChange={load}
            />
          ) : (
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Ready to commit?
              </h3>
              <p className="mt-1 text-sm text-ink-500">
                When you both agree on terms, draft a contract that captures the
                trade. Our AI will suggest plain-language terms based on your
                conversation; you can edit anything before sending.
              </p>
              <button
                type="button"
                onClick={() => setDraftOpen(true)}
                className="btn-brand mt-3 w-full"
              >
                <Sparkles className="h-4 w-4" /> Draft contract
              </button>
            </div>
          )}

          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Stay safe
            </h3>
            <ul className="mt-1 space-y-1 text-xs text-ink-500">
              {[
                "Meet in public during daylight.",
                "Inspect before exchanging.",
                "Trust your gut — walk away from anything off.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-1.5">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600"
                    strokeWidth={2.5}
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {draftOpen && id && (
        <DraftContractModal
          negotiationId={id}
          onClose={() => setDraftOpen(false)}
          onCreated={async () => {
            setDraftOpen(false);
            await load();
          }}
        />
      )}
    </Container>
  );
}

// ----------------------------------------------------------------------
// AI Draft modal — calls AI, lets the user edit, posts as a contract
// ----------------------------------------------------------------------
function DraftContractModal({
  negotiationId,
  onClose,
  onCreated,
}: {
  negotiationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [terms, setTerms] = useState<ContractTerms | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ terms: ContractTerms }>(
        `/negotiations/${negotiationId}/contract/draft`,
        { method: "POST" }
      );
      setTerms(r.terms);
    } catch (e: any) {
      setError(e?.body?.message ?? e?.body?.error ?? e?.message ?? "Draft failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    if (!terms) return;
    setBusy(true);
    setError(null);
    try {
      // Strip empty optional fields before sending
      const payload = {
        terms: {
          whatPartyAGives: terms.whatPartyAGives.trim(),
          whatPartyBGives: terms.whatPartyBGives.trim(),
          meetupLocation: terms.meetupLocation?.trim() || undefined,
          meetupAt: terms.meetupAt?.trim() || undefined,
          conditions: terms.conditions?.trim() || undefined,
        },
      };
      await api(`/negotiations/${negotiationId}/contract`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onCreated();
    } catch (e: any) {
      const fieldErr = e?.body?.issues?.[0];
      setError(
        fieldErr?.message ?? e?.body?.error ?? e?.message ?? "Could not send"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Draft a contract</h2>
          <p className="mt-1 text-xs text-ink-500">
            <Sparkles className="inline h-3.5 w-3.5 text-brand-600" /> Suggested
            by AI based on your conversation. Edit anything before sending.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-100" aria-label="Close">
          <XIcon className="h-5 w-5 text-ink-500" />
        </button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface-200" />
          <div className="h-20 animate-pulse rounded-xl bg-surface-100" />
          <div className="h-20 animate-pulse rounded-xl bg-surface-100" />
          <p className="text-center text-xs text-ink-400">
            AI is drafting your contract…
          </p>
        </div>
      ) : terms ? (
        <div className="mt-5 space-y-4">
          <Field
            label="Party A (lister) gives"
            value={terms.whatPartyAGives}
            onChange={(v) => setTerms({ ...terms, whatPartyAGives: v })}
          />
          <Field
            label="Party B (requester) gives"
            value={terms.whatPartyBGives}
            onChange={(v) => setTerms({ ...terms, whatPartyBGives: v })}
          />
          <Field
            label="Meetup location (optional)"
            value={terms.meetupLocation ?? ""}
            onChange={(v) => setTerms({ ...terms, meetupLocation: v })}
            single
          />
          <DateTimeField
            label="Meetup date & time (optional)"
            iso={terms.meetupAt ?? ""}
            onChange={(iso) => setTerms({ ...terms, meetupAt: iso })}
          />
          <Field
            label="Conditions (optional)"
            value={terms.conditions ?? ""}
            onChange={(v) => setTerms({ ...terms, conditions: v })}
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={generate}
              disabled={loading || busy}
              className="btn-ghost"
            >
              <Sparkles className="h-4 w-4" /> Regenerate
            </button>
            <button onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button onClick={send} disabled={busy} className="btn-primary">
              {busy ? "Sending…" : "Send to other party"}
            </button>
          </div>
          <p className="text-center text-xs text-ink-400">
            Once sent, both parties type their full name to sign. Either party
            can cancel before both have signed.
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={generate} className="btn-primary mt-3">
            Try again
          </button>
        </div>
      )}
    </Modal>
  );
}

// ----------------------------------------------------------------------
// ContractCard — shows the active/signed contract + sign / cancel actions
// ----------------------------------------------------------------------
function ContractCard({
  contract,
  me,
  negotiation,
  onChange,
}: {
  contract: Contract;
  me: { id: string } | null;
  negotiation: Negotiation;
  onChange: () => Promise<void> | void;
}) {
  const [signOpen, setSignOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const terms: ContractTerms = safeJson(contract.termsJson);
  const iAmA = me?.id === contract.partyAUserId;
  const iAmB = me?.id === contract.partyBUserId;
  const myUnsigned =
    (iAmA && !contract.partyASignedAt) || (iAmB && !contract.partyBSignedAt);
  const otherSigned = iAmA ? contract.partyBSignedAt : contract.partyASignedAt;

  async function cancel() {
    if (!confirm("Cancel this contract? You can draft a new one afterwards.")) return;
    setBusy(true);
    try {
      await api(`/contracts/${contract.id}/cancel`, { method: "POST" });
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div
        className={`flex items-center gap-2 border-b border-surface-200 px-4 py-3 text-xs font-semibold ${
          contract.status === "signed"
            ? "bg-brand-50 text-brand-700"
            : "bg-amber-50 text-amber-800"
        }`}
      >
        {contract.status === "signed" ? (
          <>
            <ShieldCheck className="h-4 w-4" /> Signed by both parties
          </>
        ) : (
          <>
            <FileSignature className="h-4 w-4" /> Awaiting signatures
          </>
        )}
      </div>
      <div className="space-y-3 p-4 text-sm">
        <TermLine label="Party A gives" value={terms.whatPartyAGives} />
        <TermLine label="Party B gives" value={terms.whatPartyBGives} />
        {terms.meetupLocation && (
          <TermLine label="Meetup" value={terms.meetupLocation} />
        )}
        {terms.meetupAt && (
          <TermLine
            label="When"
            value={(() => {
              try {
                return new Date(terms.meetupAt).toLocaleString();
              } catch {
                return terms.meetupAt!;
              }
            })()}
          />
        )}
        {terms.conditions && (
          <TermLine label="Conditions" value={terms.conditions} />
        )}

        <div className="space-y-1.5 border-t border-surface-200 pt-3 text-xs">
          <SigLine
            label={`Party A (lister)${iAmA ? " — you" : ""}`}
            name={contract.partyASignedName}
            at={contract.partyASignedAt}
          />
          <SigLine
            label={`Party B (requester)${iAmB ? " — you" : ""}`}
            name={contract.partyBSignedName}
            at={contract.partyBSignedAt}
          />
        </div>

        {contract.status === "signed" ? (
          <div className="rounded-xl bg-brand-50 p-3 text-center text-xs text-brand-700">
            🎉 Trade agreed. Meet, swap, and good luck.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {myUnsigned && (
              <button
                onClick={() => setSignOpen(true)}
                className="btn-brand flex-1"
              >
                <FileSignature className="h-4 w-4" />
                Sign{otherSigned ? " (completes contract)" : ""}
              </button>
            )}
            {!myUnsigned && (
              <p className="text-xs text-ink-500">
                You've signed. Waiting on the other party.
              </p>
            )}
            <button
              onClick={cancel}
              disabled={busy}
              className="btn-ghost text-xs"
            >
              Cancel contract
            </button>
          </div>
        )}
      </div>

      {signOpen && (
        <SignModal
          contractId={contract.id}
          onClose={() => setSignOpen(false)}
          onSigned={async () => {
            setSignOpen(false);
            await onChange();
          }}
        />
      )}
    </div>
  );
}

function SignModal({
  contractId,
  onClose,
  onSigned,
}: {
  contractId: string;
  onClose: () => void;
  onSigned: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/contracts/${contractId}/sign`, {
        method: "POST",
        body: JSON.stringify({ typedName: name }),
      });
      onSigned();
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Could not sign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold text-ink-900">Sign the contract</h2>
      <p className="mt-1 text-sm text-ink-500">
        Type your full legal name to sign. Your signature is recorded with a
        timestamp and IP address.
      </p>
      <form onSubmit={sign} className="mt-5 space-y-3">
        <label className="block">
          <span className="label">Full name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-1 font-display text-lg"
            placeholder="Your name"
            minLength={2}
            maxLength={120}
            autoFocus
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={busy || name.length < 2} className="btn-primary">
            {busy ? "Signing…" : "Sign"}
          </button>
        </div>
        <p className="text-xs text-ink-400">
          By signing you agree to the Terms and confirm the contract above is
          accurate.
        </p>
      </form>
    </Modal>
  );
}

// ---------- bits ----------
function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  single,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  single?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {single ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input mt-1"
          placeholder={placeholder}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="input mt-1"
        />
      )}
    </label>
  );
}

// Converts between an ISO 8601 string (stored) and the browser's
// datetime-local format (displayed in the user's local timezone).
function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Build local YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(local: string): string {
  if (!local) return "";
  // datetime-local has no timezone — interpret as local time.
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function DateTimeField({
  label,
  iso,
  onChange,
}: {
  label: string;
  iso: string;
  onChange: (iso: string) => void;
}) {
  const local = isoToLocalInput(iso);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type="datetime-local"
        value={local}
        onChange={(e) => onChange(localInputToIso(e.target.value))}
        className="input mt-1"
      />
      {iso && (
        <p className="mt-1 text-xs text-ink-400">
          Shown in your local time. Stored as {iso}.
        </p>
      )}
    </label>
  );
}

function TermLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink-900">
        {value}
      </div>
    </div>
  );
}

function SigLine({
  label,
  name,
  at,
}: {
  label: string;
  name: string | null;
  at: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink-500">{label}</span>
      {at ? (
        <span className="inline-flex items-center gap-1 text-brand-700">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="font-medium">{name}</span>
          <span className="text-ink-400">· {new Date(at).toLocaleDateString()}</span>
        </span>
      ) : (
        <span className="text-ink-400">not yet signed</span>
      )}
    </div>
  );
}

function safeJson(s: string): ContractTerms {
  try {
    return JSON.parse(s);
  } catch {
    return { whatPartyAGives: "", whatPartyBGives: "" };
  }
}
