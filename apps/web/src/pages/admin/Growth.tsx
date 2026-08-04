import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";

interface CampaignFunnel {
  campaign: string;
  source: string;
  medium: string;
  visitors: number;
  listing_intents: number;
  proposal_intents: number;
  signups: number;
  first_listings: number;
  target_area: string | null;
  target_area_posters: number | null;
  negotiation_starters: number;
  completed_traders: number;
}

interface GrowthStats {
  growth: {
    windowDays: number;
    campaigns: CampaignFunnel[];
  };
}

interface FunnelTotal {
  label: string;
  value: number;
  detail: string;
}

export default function AdminGrowth() {
  const [growth, setGrowth] = useState<GrowthStats["growth"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<GrowthStats>("/admin/stats")
      .then((stats) => setGrowth(stats.growth))
      .catch((e) => setError(e?.message ?? "Failed to load growth funnel"));
  }, []);

  const totals = useMemo<FunnelTotal[]>(() => {
    if (!growth) return [];
    const sum = (field: keyof CampaignFunnel) =>
      growth.campaigns.reduce((total, campaign) => {
        const value = campaign[field];
        return total + (typeof value === "number" ? value : 0);
      }, 0);

    return [
      {
        label: "Campaign visitors",
        value: sum("visitors"),
        detail: "Anonymous visitors, summed across campaign rows",
      },
      {
        label: "Offer intent",
        value: sum("listing_intents"),
        detail: "Visitors who chose a measured listing starter",
      },
      {
        label: "Attributed members",
        value: sum("signups"),
        detail: "Accounts retaining the same campaign attribution",
      },
      {
        label: "First listings",
        value: sum("first_listings"),
        detail: "Attributed members with a non-deleted listing",
      },
      {
        label: "Proposal intent",
        value: sum("proposal_intents"),
        detail: "Visitors who chose to start a measured proposal",
      },
      {
        label: "Started talks",
        value: sum("negotiation_starters"),
        detail: "Attributed members who opened a negotiation",
      },
      {
        label: "Completed traders",
        value: sum("completed_traders"),
        detail: "Attributed members in a separately confirmed exchange",
      },
    ];
  }, [growth]);

  if (error)
    return <div className="card p-6 text-red-700">Error: {error}</div>;
  if (!growth) return <div className="card h-40 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Growth funnel</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500">
          Find the first honest point where a campaign stops producing real
          marketplace activity. Counts cover campaigns visited during the last{" "}
          {growth.windowDays} days.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {totals.map((total) => (
          <div key={total.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              {total.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-ink-900">
              {total.value.toLocaleString()}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              {total.detail}
            </p>
          </div>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-surface-200 p-5">
          <h2 className="text-base font-semibold text-ink-900">
            Campaign evidence
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-500">
            Offer and proposal intent are first-event signals, not listings or
            negotiations. Member outcomes remain server-authoritative.
          </p>
        </div>

        {growth.campaigns.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">
            No campaign visits have been measured in this window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-surface-50 text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Campaign</th>
                  <th className="px-3 py-3 font-semibold">Visitors</th>
                  <th className="px-3 py-3 font-semibold">Offer intent</th>
                  <th className="px-3 py-3 font-semibold">Members</th>
                  <th className="px-3 py-3 font-semibold">Listings</th>
                  <th className="px-3 py-3 font-semibold">Proposal intent</th>
                  <th className="px-3 py-3 font-semibold">Talks</th>
                  <th className="px-3 py-3 font-semibold">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {growth.campaigns.map((campaign) => (
                  <tr
                    key={`${campaign.source}:${campaign.medium}:${campaign.campaign}`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-ink-900">
                        {campaign.campaign.replaceAll("_", " ")}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-400">
                        {campaign.source} / {campaign.medium}
                      </div>
                    </td>
                    <Count value={campaign.visitors} />
                    <Count
                      value={campaign.listing_intents}
                      rate={rate(campaign.listing_intents, campaign.visitors)}
                      denominator="visits"
                    />
                    <Count
                      value={campaign.signups}
                      rate={rate(campaign.signups, campaign.visitors)}
                      denominator="visits"
                    />
                    <Count
                      value={campaign.first_listings}
                      rate={rate(campaign.first_listings, campaign.signups)}
                      denominator="members"
                    />
                    <Count
                      value={campaign.proposal_intents}
                      rate={rate(campaign.proposal_intents, campaign.visitors)}
                      denominator="visits"
                    />
                    <Count
                      value={campaign.negotiation_starters}
                      rate={rate(
                        campaign.negotiation_starters,
                        campaign.signups
                      )}
                      denominator="members"
                    />
                    <Count
                      value={campaign.completed_traders}
                      rate={rate(campaign.completed_traders, campaign.signups)}
                      denominator="members"
                      strong
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="border-t border-surface-200 px-5 py-3 text-xs leading-5 text-ink-500">
          These columns are diagnostic signals, not a guaranteed linear
          sequence. A visitor may act without using a measured starter, and a
          member may appear in more than one campaign row. Totals therefore
          sum campaign rows and must not be reported as unique people or
          completed trades.
        </p>
      </section>
    </div>
  );
}

function Count({
  value,
  rate: valueRate,
  denominator,
  strong = false,
}: {
  value: number;
  rate?: number | null;
  denominator?: string;
  strong?: boolean;
}) {
  return (
    <td className="px-3 py-4">
      <div className={strong ? "font-semibold text-brand-700" : "font-medium text-ink-900"}>
        {value.toLocaleString()}
      </div>
      {valueRate !== undefined && denominator ? (
        <div className="text-xs text-ink-400">
          {formatRate(valueRate)} of {denominator}
        </div>
      ) : null}
    </td>
  );
}

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

function formatRate(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
