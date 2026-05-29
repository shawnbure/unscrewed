import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../lib/api.js";

interface SmsRow {
  id: string;
  user_id: string | null;
  direction: "outbound" | "inbound";
  to_number: string;
  from_number: string | null;
  telnyx_message_id: string | null;
  status: string | null;
  error_code: string | null;
  error_message: string | null;
  body: string | null;
  date_created: number;
  date_modified: number;
}

export default function AdminSms() {
  const [sp, setSp] = useSearchParams();
  const userId = sp.get("userId") ?? "";
  const [items, setItems] = useState<SmsRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = new URLSearchParams();
      if (userId) u.set("userId", userId);
      u.set("limit", "200");
      const r = await api<{ items: SmsRow[] }>(`/admin/sms?${u.toString()}`);
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink-900">SMS log</h1>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input
          value={userId}
          onChange={(e) => {
            const next = new URLSearchParams(sp);
            if (e.target.value) next.set("userId", e.target.value);
            else next.delete("userId");
            setSp(next);
          }}
          placeholder="Filter by user id (optional)"
          className="input flex-1 min-w-[260px]"
        />
        <button onClick={load} className="btn-ghost">
          Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-left text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Dir</th>
                <th className="p-3">From / To</th>
                <th className="p-3">Status</th>
                <th className="p-3">Body / Error</th>
                <th className="p-3">Telnyx ID</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ink-500">
                    No SMS log entries.
                  </td>
                </tr>
              )}
              {items.map((s) => (
                <tr key={s.id} className="border-t border-sand-200 align-top">
                  <td className="p-3 text-xs text-ink-500 whitespace-nowrap">
                    {new Date(s.date_created).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        s.direction === "outbound"
                          ? "chip bg-sky-50 text-sky-700"
                          : "chip bg-violet-50 text-violet-700"
                      }
                    >
                      {s.direction}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    <div className="font-mono text-ink-900">{s.to_number}</div>
                    {s.from_number && (
                      <div className="font-mono text-ink-400">
                        ← {s.from_number}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <StatusChip status={s.status} />
                  </td>
                  <td className="p-3 text-xs">
                    {s.error_message ? (
                      <div className="text-red-700">
                        {s.error_code ? `[${s.error_code}] ` : ""}
                        {s.error_message}
                      </div>
                    ) : (
                      <div className="line-clamp-2 text-ink-700">
                        {s.body}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-ink-400">
                    {s.telnyx_message_id?.slice(0, 8) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string | null }) {
  if (!status) return <span className="chip">—</span>;
  const tone = status.includes("fail")
    ? "bg-red-50 text-red-700"
    : status === "delivered"
      ? "bg-brand-50 text-brand-700"
      : status === "sent" || status === "queued" || status === "sending"
        ? "bg-amber-50 text-amber-700"
        : "bg-sand-100 text-ink-700";
  return <span className={`chip ${tone}`}>{status}</span>;
}
