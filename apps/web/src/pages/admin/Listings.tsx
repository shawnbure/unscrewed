import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";
import { photoUrl } from "../../lib/photoUrl.js";
import { CATEGORIES } from "../../ui/CategoryTile.js";

interface Row {
  id: string;
  user_id: string;
  kind: "good" | "service";
  title: string;
  description: string;
  category: string;
  status: string;
  is_archived: number;
  is_deleted: number;
  postal_code: string;
  date_created: number;
  owner_email: string;
  owner_name: string;
  firstPhotoKey: string | null;
}

type Status = "active" | "archived" | "deleted" | "withdrawn" | "all";

export default function AdminListings() {
  const [items, setItems] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = new URLSearchParams();
      u.set("status", status);
      if (q.trim()) u.set("q", q.trim());
      u.set("limit", "100");
      const r = await api<{ items: Row[] }>(`/admin/listings?${u.toString()}`);
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await api(`/admin/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink-900">Listings</h1>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or description"
          className="input flex-1 min-w-[200px]"
        />
        <Tabs value={status} onChange={setStatus} />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading && (
          <div className="card p-6 text-center text-ink-500">Loading…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="card p-6 text-center text-ink-500">
            No listings match.
          </div>
        )}
        {items.map((l) => {
          const cat = CATEGORIES.find((c) => c.slug === l.category);
          return (
            <div
              key={l.id}
              className={`card flex gap-3 p-3 ${l.is_deleted ? "opacity-60" : ""}`}
            >
              <div
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl ${cat?.tint ?? "bg-sand-100"}`}
              >
                {l.firstPhotoKey ? (
                  <img
                    src={photoUrl(l.firstPhotoKey)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl" aria-hidden>
                    {cat?.emoji ?? "✨"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/listing/${l.id}`}
                        className="line-clamp-1 font-semibold text-ink-900 hover:text-brand-700"
                      >
                        {l.title}
                      </Link>
                      <span className="chip">{l.kind}</span>
                      {cat && (
                        <span className="chip">
                          {cat.emoji} {cat.label}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs text-ink-500">
                      {l.description}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {l.owner_name} · {l.owner_email} ·{" "}
                      {new Date(l.date_created).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge
                    status={l.status}
                    archived={l.is_archived === 1}
                    deleted={l.is_deleted === 1}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {l.is_archived === 0 && l.is_deleted === 0 && (
                    <button
                      onClick={() => patch(l.id, { isArchived: true })}
                      className="rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-700 hover:bg-amber-100"
                    >
                      Hide
                    </button>
                  )}
                  {l.is_archived === 1 && l.is_deleted === 0 && (
                    <button
                      onClick={() => patch(l.id, { isArchived: false })}
                      className="rounded-lg bg-brand-50 px-2 py-1 font-medium text-brand-700 hover:bg-brand-100"
                    >
                      Unhide
                    </button>
                  )}
                  {l.status === "active" && (
                    <button
                      onClick={() => patch(l.id, { status: "withdrawn" })}
                      className="rounded-lg bg-sand-100 px-2 py-1 font-medium text-ink-700 hover:bg-sand-200"
                    >
                      Withdraw
                    </button>
                  )}
                  {l.status !== "active" && l.is_deleted === 0 && (
                    <button
                      onClick={() => patch(l.id, { status: "active" })}
                      className="rounded-lg bg-brand-50 px-2 py-1 font-medium text-brand-700 hover:bg-brand-100"
                    >
                      Reactivate
                    </button>
                  )}
                  {l.is_deleted === 0 ? (
                    <button
                      onClick={() => {
                        if (confirm(`Soft-delete "${l.title}"?`))
                          patch(l.id, { isDeleted: true });
                      }}
                      className="rounded-lg bg-red-50 px-2 py-1 font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => patch(l.id, { isDeleted: false })}
                      className="rounded-lg bg-sand-100 px-2 py-1 font-medium text-ink-700 hover:bg-sand-200"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tabs({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  const opts: { v: Status; label: string }[] = [
    { v: "active", label: "Active" },
    { v: "archived", label: "Hidden" },
    { v: "withdrawn", label: "Withdrawn" },
    { v: "deleted", label: "Deleted" },
    { v: "all", label: "All" },
  ];
  return (
    <div className="inline-flex rounded-xl bg-sand-100 p-1 text-sm">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-lg px-3 py-1.5 font-medium ${value === o.v ? "bg-white shadow-sm text-ink-900" : "text-ink-500"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
  archived,
  deleted,
}: {
  status: string;
  archived: boolean;
  deleted: boolean;
}) {
  if (deleted)
    return <span className="chip bg-red-50 text-red-700">deleted</span>;
  if (archived)
    return <span className="chip bg-amber-50 text-amber-800">hidden</span>;
  if (status === "withdrawn")
    return <span className="chip">withdrawn</span>;
  if (status === "traded")
    return <span className="chip-brand">traded</span>;
  return <span className="chip-brand">active</span>;
}
