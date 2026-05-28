import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";

interface Message {
  id: string;
  senderUserId: string;
  body: string;
  dateCreated: number;
}

export default function NegotiationPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  async function load() {
    const r = await api<{
      negotiation: any;
      messages: Message[];
      contracts: any[];
    }>(`/negotiations/${id}`);
    setData(r);
  }

  useEffect(() => {
    if (!id) return;
    load().catch(console.error);
    // Open WS for live messages + draft contract sync
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${proto}://${location.host}/api/negotiations/${id}/ws`
    );
    wsRef.current = ws;
    ws.onmessage = () => load();
    return () => ws.close();
  }, [id]);

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

  if (!data) return <div className="p-8 text-neutral-500">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold">Negotiation</h1>
      <p className="text-sm text-neutral-500">
        Offering: {data.negotiation.offering}
      </p>
      <ul className="mt-6 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {data.messages.map((m: Message) => (
          <li key={m.id} className="rounded border bg-white p-3">
            <div className="text-xs text-neutral-500">
              {new Date(m.dateCreated).toLocaleString()} ·{" "}
              {m.senderUserId.slice(0, 8)}
            </div>
            <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
          </li>
        ))}
      </ul>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply…"
          className="flex-1 rounded border border-neutral-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-brand text-white px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <div className="mt-8 rounded border bg-amber-50 border-amber-200 p-4 text-sm">
        <div className="font-semibold">Ready to commit?</div>
        <p className="mt-1 text-neutral-700">
          Once you both agree on terms, click "Draft contract" to capture them.
          Both parties type their full name to sign. Contract drafting +
          signing UI ships in the next iteration.
        </p>
      </div>
    </div>
  );
}
