import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";
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

export default function NegotiationPage() {
  const { id } = useParams();
  const [me, setMe] = useState<string | null>(null);
  const [data, setData] = useState<{
    negotiation: Negotiation;
    messages: Message[];
    contracts: any[];
  } | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    if (!id) return;
    const r = await api<any>(`/negotiations/${id}`);
    setData(r);
  }

  useEffect(() => {
    api<{ id: string }>("/me").then((r) => setMe(r.id)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    load().catch(console.error);
    // Live updates via WS — best effort; fallback to manual reload on send.
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

  return (
    <Container size="md" className="py-6">
      <Link to="/browse" className="text-sm text-ink-500 hover:text-brand-700">
        ← Browse
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px]">
        <section className="card flex h-[70vh] flex-col">
          <header className="border-b border-sand-200 px-4 py-3">
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
              const mine = me && m.senderUserId === me;
              return (
                <li
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      mine
                        ? "bg-brand-500 text-white"
                        : "bg-sand-100 text-ink-900"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                    <div
                      className={`mt-0.5 text-[10px] ${mine ? "text-brand-50/80" : "text-ink-400"}`}
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
            className="flex items-center gap-2 border-t border-sand-200 p-3"
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

        <aside className="space-y-3">
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Their offer
            </h3>
            <p className="mt-1 text-sm text-ink-700">{n.offering}</p>
          </div>
          <div className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Ready to commit?
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Once you both agree, draft a contract that captures the terms.
              Both parties sign by typing their full name.
            </p>
            <button
              type="button"
              disabled
              className="btn-outline mt-3 w-full opacity-60"
              title="Coming soon"
            >
              Draft contract (soon)
            </button>
          </div>
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
    </Container>
  );
}
