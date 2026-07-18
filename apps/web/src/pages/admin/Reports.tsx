import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Eye, X } from "lucide-react";
import { REPORT_REASON_LABELS, type ReportReason, type ReportTargetType } from "@unscrewed/shared";
import { api } from "../../lib/api.js";

interface ReportRow {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  target_label: string | null;
  reason: ReportReason;
  notes: string | null;
  status: "open" | "auto_hidden" | "resolved_action" | "resolved_no_action";
  reporter_name: string;
  distinct_reporters: number;
  date_created: number;
}

type StatusFilter = "open_and_auto" | "open" | "auto_hidden" | "all";

export default function AdminReports() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("open_and_auto");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: ReportRow[] }>(
        `/reports/admin?status=${status}`
      );
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(
    id: string,
    body:
      | { status: "resolved_action"; action: "hide" | "delete" | "approve" }
      | { status: "resolved_no_action" }
  ) {
    await api(`/reports/admin/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await load();
  }

  const grouped = groupByTarget(items).filter((g) => g.reports.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-ink-900">Reports</h1>
        <Tabs value={status} onChange={setStatus} />
      </div>

      {loading && <div className="card p-6 text-center text-ink-500">Loading…</div>}
      {!loading && grouped.length === 0 && (
        <div className="card p-6 text-center text-ink-500">
          Nothing here — everything's quiet.
        </div>
      )}

      <ul className="space-y-4">
        {grouped.map((g) => (
          <li key={`${g.target_type}:${g.target_id}`} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="chip bg-ink-900 text-white">
                    {g.target_type.replace("_", " ")}
                  </span>
                  <span className="chip bg-red-50 text-red-800">
                    {g.reports.length} report{g.reports.length === 1 ? "" : "s"}
                  </span>
                  <span className="chip">
                    {g.distinct} distinct reporter
                    {g.distinct === 1 ? "" : "s"}
                  </span>
                  {g.reports[0]?.status === "auto_hidden" && (
                    <span className="chip bg-amber-100 text-amber-900">
                      auto-hidden
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-lg font-semibold text-ink-900">
                  {g.target_label ?? "(target missing)"}
                </h2>
                <Link
                  to={targetHref(g.target_type, g.target_id)}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" /> View target
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    g.reports[0] && resolve(g.reports[0].id, { status: "resolved_action", action: "hide" })
                  }
                  className="rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-800 hover:bg-amber-100"
                >
                  Hide
                </button>
                <button
                  type="button"
                  onClick={() =>
                    g.reports[0] && resolve(g.reports[0].id, { status: "resolved_action", action: "delete" })
                  }
                  className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() =>
                    g.reports[0] && resolve(g.reports[0].id, { status: "resolved_action", action: "approve" })
                  }
                  className="rounded-lg bg-brand-500 px-2.5 py-1 font-semibold text-white hover:bg-brand-600"
                >
                  <Check className="mr-1 inline h-3 w-3" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() =>
                    g.reports[0] && resolve(g.reports[0].id, { status: "resolved_no_action" })
                  }
                  className="rounded-lg bg-surface-100 px-2.5 py-1 font-medium text-ink-700 hover:bg-surface-200"
                >
                  <X className="mr-1 inline h-3 w-3" /> Dismiss
                </button>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {g.reports.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink-500">
                    <span>
                      <span className="font-semibold text-ink-900">
                        {r.reporter_name}
                      </span>{" "}
                      · {REPORT_REASON_LABELS[r.reason]}
                    </span>
                    <span>{new Date(r.date_created).toLocaleString()}</span>
                  </div>
                  {r.notes && (
                    <p className="mt-1 whitespace-pre-wrap text-ink-700">
                      {r.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Grouped {
  target_type: ReportTargetType;
  target_id: string;
  target_label: string | null;
  distinct: number;
  reports: ReportRow[];
}
function groupByTarget(items: ReportRow[]): Grouped[] {
  const map = new Map<string, Grouped>();
  for (const r of items) {
    const k = `${r.target_type}:${r.target_id}`;
    let g = map.get(k);
    if (!g) {
      g = {
        target_type: r.target_type,
        target_id: r.target_id,
        target_label: r.target_label,
        distinct: r.distinct_reporters,
        reports: [],
      };
      map.set(k, g);
    }
    g.reports.push(r);
    g.distinct = Math.max(g.distinct, r.distinct_reporters);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.distinct - a.distinct
  );
}

function targetHref(type: ReportTargetType, id: string): string {
  if (type === "listing") return `/listing/${id}`;
  if (type === "user") return `/admin/users`;
  return `/admin/blog`;
}

function Tabs({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (s: StatusFilter) => void;
}) {
  const opts: { v: StatusFilter; label: string }[] = [
    { v: "open_and_auto", label: "Needs review" },
    { v: "open", label: "Open" },
    { v: "auto_hidden", label: "Auto-hidden" },
    { v: "all", label: "All" },
  ];
  return (
    <div className="inline-flex rounded-xl bg-surface-100 p-1 text-sm">
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
