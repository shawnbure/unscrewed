import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";

interface User {
  id: string;
  email: string;
  display_name: string;
  phone_e164: string;
  phone_verified_at: number | null;
  is_admin: number;
  is_archived: number;
  is_deleted: number;
  date_created: number;
}

type Status = "active" | "archived" | "deleted" | "all";

export default function AdminUsers() {
  const [items, setItems] = useState<User[]>([]);
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
      const r = await api<{ items: User[] }>(`/admin/users?${u.toString()}`);
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await api(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink-900">Users</h1>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, phone"
          className="input flex-1 min-w-[200px]"
        />
        <StatusTabs value={status} onChange={setStatus} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-left text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Signed up</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-ink-500">
                    No users match.
                  </td>
                </tr>
              )}
              {items.map((u) => (
                <tr
                  key={u.id}
                  className={`border-t border-sand-200 ${u.is_deleted ? "opacity-50" : ""}`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-ink-900">
                          {u.display_name}
                        </div>
                        <div className="text-xs text-ink-500">{u.email}</div>
                      </div>
                      {u.is_admin === 1 && (
                        <span className="chip-brand">admin</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-ink-700">{u.phone_e164}</div>
                    <div className="text-xs">
                      {u.phone_verified_at ? (
                        <span className="text-brand-700">verified</span>
                      ) : (
                        <span className="text-amber-700">unverified</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-ink-500">
                    {new Date(u.date_created).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <StatusBadge
                      archived={u.is_archived === 1}
                      deleted={u.is_deleted === 1}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {u.is_archived === 0 && u.is_deleted === 0 && (
                        <button
                          onClick={() => patch(u.id, { isArchived: true })}
                          className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          Suspend
                        </button>
                      )}
                      {u.is_archived === 1 && u.is_deleted === 0 && (
                        <button
                          onClick={() => patch(u.id, { isArchived: false })}
                          className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                        >
                          Unsuspend
                        </button>
                      )}
                      {u.is_deleted === 0 ? (
                        <button
                          onClick={() => {
                            if (confirm(`Soft-delete ${u.display_name}?`))
                              patch(u.id, { isDeleted: true });
                          }}
                          className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => patch(u.id, { isDeleted: false })}
                          className="rounded-lg bg-sand-100 px-2 py-1 text-xs font-medium text-ink-700 hover:bg-sand-200"
                        >
                          Restore
                        </button>
                      )}
                    </div>
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

function StatusTabs({
  value,
  onChange,
}: {
  value: Status;
  onChange: (s: Status) => void;
}) {
  const opts: { v: Status; label: string }[] = [
    { v: "active", label: "Active" },
    { v: "archived", label: "Suspended" },
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
  archived,
  deleted,
}: {
  archived: boolean;
  deleted: boolean;
}) {
  if (deleted)
    return (
      <span className="chip bg-red-50 text-red-700">deleted</span>
    );
  if (archived)
    return (
      <span className="chip bg-amber-50 text-amber-800">suspended</span>
    );
  return <span className="chip-brand">active</span>;
}
