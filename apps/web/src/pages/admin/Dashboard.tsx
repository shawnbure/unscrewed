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
      target_area: string | null;
      target_area_posters: number | null;
      negotiation_starters: number;
      completed_traders: number;
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
    ownerResponse: {
      windowDays: number;
      observationHours: number;
      eligibleNegotiations: number;
      respondedWithin72h: number;
      rate: number | null;
      medianHours: number | null;
      overdueAfterHours: number;
      overdueWaitingOnLister: number;
      overdueWaitingOnRequester: number;
    };
    localWatch: {
      radiusKm: number;
      maxAlertsPerUtcDay: number;
      optedIn: number;
      alertReady: number;
      attemptsLast7Days: number;
    };
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            detail="Confirmed completed trades ÷ active traders"
          />
          <Metric
            label="Owner response · 72h"
            value={
              stats.marketplace.ownerResponse.rate === null
                ? "—"
                : `${Math.round(stats.marketplace.ownerResponse.rate * 100)}%`
            }
            detail={`${stats.marketplace.ownerResponse.respondedWithin72h}/${stats.marketplace.ownerResponse.eligibleNegotiations} mature proposals · median ${formatDuration(stats.marketplace.ownerResponse.medianHours)}`}
            tone="brand"
          />
          <Metric
            label={`Overdue replies · ${stats.marketplace.ownerResponse.overdueAfterHours}h`}
            value={(
              stats.marketplace.ownerResponse.overdueWaitingOnLister +
              stats.marketplace.ownerResponse.overdueWaitingOnRequester
            ).toLocaleString()}
            detail={`${stats.marketplace.ownerResponse.overdueWaitingOnLister} listing owners · ${stats.marketplace.ownerResponse.overdueWaitingOnRequester} requesters`}
          />
          <Metric
            label="Local-watch members"
            value={stats.marketplace.localWatch.alertReady.toLocaleString()}
            detail={`${stats.marketplace.localWatch.optedIn} opted in · ${stats.marketplace.localWatch.attemptsLast7Days} alert attempts in 7d`}
            tone="brand"
          />
        </div>
        <div className="mt-3 rounded-xl bg-surface-50 px-4 py-3 text-xs leading-5 text-ink-500">
          A completed trade has both signatures and separate completion
          confirmation from both traders. Liquidity includes non-deleted
          listings posted in the last {stats.marketplace.liquidity.windowDays}{" "}
          days that have had a full{" "}
          {stats.marketplace.liquidity.observationHours}-hour observation
          window. Active traders started a negotiation, sent a message, signed,
          or confirmed a trade during the period. Owner response measures
          whether the listing owner sent a first reply within{" "}
          {stats.marketplace.ownerResponse.observationHours} hours; proposals
          younger than that are excluded from its denominator. Local-watch
          readiness requires explicit opt-in, a verified email, and a geocoded
          home ZIP; an alert attempt does not prove delivery or a visit.
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
            Anonymous campaign visits and the real marketplace actions taken
            by attributed members, for campaigns visited in the last{" "}
            {stats.growth.windowDays} days.
          </p>
        </div>
        {stats.growth.campaigns.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">
            No campaign visits yet. Share a tracked invite to start measuring.
          </p>
        ) : (
          <div>
            <table className="w-full table-fixed text-left text-xs lg:text-sm">
              <colgroup>
                <col className="w-[27%]" />
                <col className="w-[7%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[19%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="bg-surface-50 text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-3 py-3 font-semibold lg:px-4">Campaign</th>
                  <th className="px-2 py-3 font-semibold">Visits</th>
                  <th className="px-2 py-3 font-semibold">Members</th>
                  <th className="px-2 py-3 font-semibold">Posted anywhere</th>
                  <th className="px-2 py-3 font-semibold">
                    In-scope supply
                  </th>
                  <th className="px-2 py-3 font-semibold">Started talks</th>
                  <th className="px-2 py-3 font-semibold">Completed trade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {stats.growth.campaigns.map((campaign) => (
                  <tr key={`${campaign.source}:${campaign.medium}:${campaign.campaign}`}>
                    <td className="px-3 py-4 lg:px-4">
                      <div className="break-words font-medium text-ink-900">
                        {campaign.campaign.replaceAll("_", " ")}
                      </div>
                      <div className="mt-0.5 break-words text-xs text-ink-400">
                        {campaign.source} / {campaign.medium}
                      </div>
                    </td>
                    <td className="px-2 py-4 font-medium text-ink-900">
                      {campaign.visitors.toLocaleString()}
                    </td>
                    <td className="px-2 py-4">
                      <div className="font-medium text-ink-900">
                        {campaign.signups.toLocaleString()}
                      </div>
                      <div className="text-xs text-ink-400">
                        {percent(campaign.signups, campaign.visitors)} of visits
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <div className="font-medium text-ink-900">
                        {campaign.first_listings.toLocaleString()}
                      </div>
                      <div className="text-xs text-ink-400">
                        {percent(campaign.first_listings, campaign.signups)} of
                        members
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      {campaign.target_area_posters === null ? (
                        <div className="text-ink-400">Not location-scoped</div>
                      ) : (
                        <>
                          <div className="font-semibold text-brand-700">
                            {campaign.target_area_posters.toLocaleString()}
                          </div>
                          <div className="text-xs text-ink-400">
                            {campaign.target_area} ·{" "}
                            {percent(
                              campaign.target_area_posters,
                              campaign.signups
                            )}{" "}
                            of members
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-2 py-4">
                      <div className="font-medium text-ink-900">
                        {campaign.negotiation_starters.toLocaleString()}
                      </div>
                      <div className="text-xs text-ink-400">
                        {percent(
                          campaign.negotiation_starters,
                          campaign.signups
                        )}{" "}
                        of members
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <div className="font-semibold text-brand-700">
                        {campaign.completed_traders.toLocaleString()}
                      </div>
                      <div className="text-xs text-ink-400">
                        {percent(campaign.completed_traders, campaign.signups)}{" "}
                        of members
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-surface-200 px-5 py-3 text-xs leading-5 text-ink-500">
          “Posted anywhere” means at least one non-deleted listing.
          “In-scope supply” counts attributed members who posted inside the
          invited ZIP, UMass-area pool, or anywhere in the United States for
          the national movement campaign; it is deliberately separate so
          out-of-scope inventory cannot masquerade as activation.
          “Started talks” means the member initiated at least one non-deleted
          negotiation. “Completed trade” means they are a party to at least one
          agreement signed by both sides whose real exchange was separately
          confirmed by both traders. These outcome columns can overlap; they
          are not assumed to happen in a fixed order.
        </p>
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
