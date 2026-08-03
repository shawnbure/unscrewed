import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

interface ListingShareOutcomesProps {
  listingId: string;
}

interface ShareOutcomes {
  current: {
    uniqueVisitors: number;
    proposalIntents: number;
    attributedMembers: number;
    proposals: number;
    twoSidedConversations: number;
    completedTrades: number;
  };
  ownerAlertReadiness: {
    viewerIsOwner: boolean;
    emailVerified: boolean;
    notificationsEnabled: boolean;
  };
}

const METRICS: Array<{
  key: keyof ShareOutcomes["current"];
  label: string;
}> = [
  { key: "uniqueVisitors", label: "Invitation visits" },
  { key: "proposalIntents", label: "Clicked propose" },
  { key: "attributedMembers", label: "New members" },
  { key: "proposals", label: "Proposals" },
  { key: "twoSidedConversations", label: "Two-sided chats" },
  { key: "completedTrades", label: "Completed trades" },
];

export function ListingShareOutcomes({
  listingId,
}: ListingShareOutcomesProps) {
  const [data, setData] = useState<ShareOutcomes | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<ShareOutcomes>(`/growth/listing/${encodeURIComponent(listingId)}`)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch(() => {
        // The listing remains usable if private measurement is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (!data) return null;

  return (
    <section className="card p-5" aria-labelledby="share-outcomes-heading">
      <div className="flex items-start gap-3">
        <BarChart3
          className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
          strokeWidth={2}
        />
        <div>
          <h3
            id="share-outcomes-heading"
            className="text-sm font-semibold text-ink-800"
          >
            Invitation outcomes
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            Real outcomes from this listing. Sending or copying its link is not
            counted.
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        {METRICS.map((metric) => (
          <div
            key={metric.key}
            className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2"
          >
            <dt className="text-[11px] leading-tight text-ink-500">
              {metric.label}
            </dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-ink-900">
              {data.current[metric.key]}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        Counts only. Visitor identities, emails, and browsing details are not
        shown. Anonymous invitation visits expire after 90 days.
      </p>
      {data.ownerAlertReadiness.viewerIsOwner &&
        !data.ownerAlertReadiness.emailVerified && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">
              Don’t miss a real proposal
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Verify your email to receive brief trade alerts. Alerts omit
              offer text, private messages, terms, and meetup details.
            </p>
            <Link
              to="/account#email"
              className="mt-2 inline-flex text-xs font-semibold text-amber-900 underline"
            >
              Verify email in Account
            </Link>
          </div>
        )}
      {data.ownerAlertReadiness.viewerIsOwner &&
        data.ownerAlertReadiness.emailVerified &&
        !data.ownerAlertReadiness.notificationsEnabled && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">
              Trade alerts are off
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Turn them on if you want a brief email when a proposal, reply, or
              agreement update needs attention.
            </p>
            <Link
              to="/account#trade-emails"
              className="mt-2 inline-flex text-xs font-semibold text-amber-900 underline"
            >
              Review trade alerts
            </Link>
          </div>
        )}
    </section>
  );
}
