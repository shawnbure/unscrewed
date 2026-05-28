import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";

export default function ListingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { session } = useSession();
  const [data, setData] = useState<any>(null);
  const [offering, setOffering] = useState("");
  const [openingMessage, setOpeningMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api(`/listings/${id}`).then(setData).catch(console.error);
  }, [id]);

  if (!data) return <div className="p-8 text-neutral-500">Loading…</div>;
  const l = data.listing;

  async function propose(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.authenticated) {
      nav("/login");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ id: string }>(`/negotiations`, {
        method: "POST",
        body: JSON.stringify({
          listingId: id,
          offering,
          openingMessage,
        }),
      });
      nav(`/n/${r.id}`);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/browse" className="text-sm text-neutral-500 hover:text-brand">
        ← back
      </Link>
      <h1 className="text-3xl font-bold mt-2">{l.title}</h1>
      <p className="text-sm text-neutral-500">
        {l.kind} · {l.category} · {l.postal_code ?? l.postalCode}
      </p>
      <p className="mt-4 whitespace-pre-wrap">{l.description}</p>
      <div className="mt-4 rounded bg-amber-50 border border-amber-200 p-4 text-sm">
        <span className="font-semibold">Wants in trade:</span> {l.wants}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Propose a trade</h2>
      <form onSubmit={propose} className="mt-3 space-y-3">
        <textarea
          required
          rows={2}
          value={offering}
          onChange={(e) => setOffering(e.target.value)}
          placeholder="What are you offering?"
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        <textarea
          required
          rows={4}
          value={openingMessage}
          onChange={(e) => setOpeningMessage(e.target.value)}
          placeholder="Say hi — explain why this trade makes sense."
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-brand text-white px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send proposal"}
        </button>
      </form>
    </div>
  );
}
