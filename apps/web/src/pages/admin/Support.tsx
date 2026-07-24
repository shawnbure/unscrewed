import { useCallback, useEffect, useState } from "react";
import { Mail, Check, Clock3, ShieldX } from "lucide-react";
import {
  SUPPORT_TOPIC_LABELS,
  type SupportTopic,
} from "@unscrewed/shared";
import { api } from "../../lib/api.js";

type SupportStatus = "open" | "in_progress" | "resolved" | "spam";
type StatusFilter = "active" | SupportStatus | "all";

interface SupportRow {
  id: string;
  name: string;
  email: string;
  topic: SupportTopic;
  message: string;
  status: SupportStatus;
  adminNote: string | null;
  dateCreated: number;
  dateModified: number;
}

export default function AdminSupport() {
  const [items, setItems] = useState<SupportRow[]>([]);
  const [status, setStatus] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ items: SupportRow[] }>(
        `/support/admin?status=${status}`
      );
      setItems(result.items);
      setNotes(
        Object.fromEntries(
          result.items.map((item) => [item.id, item.adminNote ?? ""])
        )
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(id: string, nextStatus: SupportStatus) {
    await api(`/support/admin/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: nextStatus,
        adminNote: notes[id] ?? "",
      }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Support inbox</h1>
          <p className="mt-1 text-sm text-ink-500">
            Private messages submitted through the public contact form.
          </p>
        </div>
        <Tabs value={status} onChange={setStatus} />
      </div>

      {loading && (
        <div className="card p-6 text-center text-ink-500">Loading…</div>
      )}
      {!loading && items.length === 0 && (
        <div className="card p-6 text-center text-ink-500">
          No support requests in this view.
        </div>
      )}

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="chip">
                    {SUPPORT_TOPIC_LABELS[item.topic]}
                  </span>
                  <StatusChip status={item.status} />
                </div>
                <h2 className="mt-2 text-lg font-semibold text-ink-900">
                  {item.name}
                </h2>
                <p className="mt-0.5 text-xs text-ink-400">
                  {new Date(item.dateCreated).toLocaleString()} ·{" "}
                  <span className="font-mono">{item.id}</span>
                </p>
              </div>
              <a
                href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: unscrewed support request ${item.id}`)}`}
                className="btn-outline"
              >
                <Mail className="h-4 w-4" />
                Reply by email
              </a>
            </div>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-surface-50 p-4 text-sm leading-relaxed text-ink-700">
              {item.message}
            </p>

            <label className="mt-4 block">
              <span className="label">Private admin note</span>
              <textarea
                rows={2}
                maxLength={2000}
                value={notes[item.id] ?? ""}
                onChange={(e) =>
                  setNotes((current) => ({
                    ...current,
                    [item.id]: e.target.value,
                  }))
                }
                className="input mt-1"
                placeholder="Reply context or resolution—never shown publicly."
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => update(item.id, "in_progress")}
                className="btn-outline"
              >
                <Clock3 className="h-4 w-4" /> In progress
              </button>
              <button
                type="button"
                onClick={() => update(item.id, "resolved")}
                className="btn-brand"
              >
                <Check className="h-4 w-4" /> Resolve
              </button>
              <button
                type="button"
                onClick={() => update(item.id, "spam")}
                className="btn-ghost text-red-700"
              >
                <ShieldX className="h-4 w-4" /> Spam
              </button>
              {item.status !== "open" && (
                <button
                  type="button"
                  onClick={() => update(item.id, "open")}
                  className="btn-ghost"
                >
                  Reopen
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusChip({ status }: { status: SupportStatus }) {
  const tone =
    status === "open"
      ? "bg-brand-50 text-brand-800"
      : status === "in_progress"
        ? "bg-amber-50 text-amber-800"
        : status === "resolved"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800";
  return (
    <span className={`chip ${tone}`}>{status.replace("_", " ")}</span>
  );
}

function Tabs({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (status: StatusFilter) => void;
}) {
  const options: { value: StatusFilter; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In progress" },
    { value: "resolved", label: "Resolved" },
    { value: "spam", label: "Spam" },
    { value: "all", label: "All" },
  ];
  return (
    <div className="flex flex-wrap rounded-xl bg-surface-100 p-1 text-sm">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 font-medium ${
            value === option.value
              ? "bg-white text-ink-900 shadow-sm"
              : "text-ink-500"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
