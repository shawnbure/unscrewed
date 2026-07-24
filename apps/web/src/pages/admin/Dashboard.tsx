import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";

interface Stats {
  users: { total: number; active: number; archived: number; deleted: number };
  listings: { total: number; active: number; archived: number; deleted: number };
  negotiations: { total: number };
  recentSignups: {
    id: string;
    email: string;
    display_name: string;
    date_created: number;
  }[];
  growth: {
    windowDays: number;
    campaigns: {
      campaign: string;
      source: string;
      medium: string;
      visitors: number;
      signups: number;
      first_listings: number;
    }[];
  };
  marketplace: {
    completedTrades: {
      last7Days: number;
      previous7Days: number;
      last30Days: number;
      allTime: number;
    };
    liquidity: {
      windowDays: number;
      observationHours: number;
      eligibleListings: number;
      listingsWithNegotiation: number;
      rate: number | null;
    };
    activeTraders: { last7Days: number; last30Days: number };
    timeToFirstTrade: {
      medianHours: number | null;
      membersWithCompletedTrade: number;
    };
    tradesPerActiveTrader30Days: number | null;
  };
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
          Marketplace health
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Completed trades · 7d"
            value={stats.marketplace.completedTrades.last7Days.toLocaleString()}
            detail={`${stats.marketplace.completedTrades.last30Days} in 30d · ${stats.marketplace.completedTrades.allTime} all time`}
            tone="brand"
          />
          <Metric
            label="Listing liquidity · 72h"
            value={
              stats.marketplace.liquidity.rate === null
                ? "—"
                : `${Math.round(stats.marketplace.liquidity.rate * 100)}%`
            }
            detail={`${stats.marketplace.liquidity.listingsWithNegotiation}/${stats.marketplace.liquidity.eligibleListings} eligible listings`}
            tone="brand"
          />
          <Metric
            label="Active traders · 7d"
            value={stats.marketplace.activeTraders.last7Days.toLocaleString()}
            detail={`${stats.marketplace.activeTraders.last30Days} in 30d`}
          />
          <Metric
            label="Median signup → trade"
            value={formatDuration(stats.marketplace.timeToFirstTrade.medianHours)}
            detail={`${stats.marketplace.timeToFirstTrade.membersWithCompletedTrade} members with a completed trade`}
          />
          <Metric
            label="Trades / active trader · 30d"
            value={
              stats.marketplace.tradesPerActiveTrader30Days === null
                ? "—"
                : stats.marketplace.tradesPerActiveTrader30Days.toFixed(2)
            }
            detail="Signed trades ÷ active traders"
          />
        </div>
        <div className="mt-3 rounded-xl bg-surface-50 px-4 py-3 text-xs leading-5 text-ink-500">
          A completed trade has both signatures. Liquidity includes non-deleted
          listings posted in the last {stats.marketplace.liquidity.windowDays}{" "}
          days that have had a full {stats.marketplace.liquidity.observationHours}
          -hour observation window. Active traders negotiated, messaged, or
          completed a trade during the period.
        </div>
      </section>

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

      <section className="card overflow-hidden">
        <div className="border-b border-surface-200 p-5">
          <h2 className="text-base font-semibold text-ink-900">
            Invite funnel
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Anonymous campaign visits → members → members who posted a first
            listing, over the last {stats.growth.windowDays} days.
          </p>
        </div>
        {stats.growth.campaigns.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">
            No campaign visits yet. Share a tracked invite to start measuring.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-50 text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Campaign</th>
                  <th className="px-4 py-3 font-semibold">Visits</th>
                  <th className="px-4 py-3 font-semibold">Members</th>
                  <th className="px-4 py-3 font-semibold">First listings</th>
                  <th className="px-5 py-3 font-semibold">Activation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {stats.growth.campaigns.map((campaign) => (
                  <tr key={`${campaign.source}:${campaign.medium}:${campaign.campaign}`}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-ink-900">
                        {campaign.campaign.replaceAll("_", " ")}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-400">
                        {campaign.source} / {campaign.medium}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-ink-900">
                      {campaign.visitors.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-ink-900">
                        {campaign.signups.toLocaleString()}
                      </div>
                      <div className="text-xs text-ink-400">
                        {percent(campaign.signups, campaign.visitors)} of visits
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-ink-900">
                      {campaign.first_listings.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-semibold text-brand-700">
                      {percent(campaign.first_listings, campaign.signups)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function percent(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${days < 10 ? days.toFixed(1) : Math.round(days)}d`;
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "brand";
}) {
  const accent = tone === "brand" ? "text-brand-700" : "text-ink-900";
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent}`}>{value}</div>
      <div className="mt-1 text-xs leading-4 text-ink-400">{detail}</div>
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
