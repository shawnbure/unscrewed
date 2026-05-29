import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";

interface Stats {
  users: { total: number; active: number; archived: number; deleted: number };
  listings: { total: number; active: number; archived: number; deleted: number };
  negotiations: { total: number };
  sms: { outbound: number };
  recentSignups: {
    id: string;
    email: string;
    display_name: string;
    date_created: number;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>("/admin/stats")
      .then(setStats)
      .catch((e) => setError(e?.message ?? "Failed"));
  }, []);

  if (error)
    return <div className="card p-6 text-red-700">Error: {error}</div>;
  if (!stats)
    return <div className="card h-40 animate-pulse" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-400">
          Users
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={stats.users.total} />
          <Stat label="Active" value={stats.users.active} tone="brand" />
          <Stat label="Archived" value={stats.users.archived} tone="amber" />
          <Stat label="Deleted" value={stats.users.deleted} tone="red" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-400">
          Listings
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={stats.listings.total} />
          <Stat label="Active" value={stats.listings.active} tone="brand" />
          <Stat label="Archived" value={stats.listings.archived} tone="amber" />
          <Stat label="Deleted" value={stats.listings.deleted} tone="red" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-400">
          Activity
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Negotiations started" value={stats.negotiations.total} />
          <Stat label="Outbound SMS" value={stats.sms.outbound} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold text-ink-900">Recent signups</h2>
        {stats.recentSignups.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No signups yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-sand-200">
            {stats.recentSignups.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-ink-900">
                    {u.display_name}
                  </div>
                  <div className="text-xs text-ink-500">{u.email}</div>
                </div>
                <div className="text-xs text-ink-400">
                  {new Date(u.date_created).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/admin/users"
          className="mt-3 inline-block text-sm text-brand-700 hover:underline"
        >
          See all users →
        </Link>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "brand" | "amber" | "red";
}) {
  const accent = {
    neutral: "text-ink-900",
    brand: "text-brand-700",
    amber: "text-amber-700",
    red: "text-red-700",
  }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
