import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, X, Save, ShieldCheck, ShieldOff } from "lucide-react";
import { api } from "../../lib/api.js";

interface User {
  id: string;
  email: string;
  display_name: string;
  phone_e164: string;
  phone_verified_at: number | null;
  home_zip: string | null;
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<User | null>(null);

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
    setSelected(new Set());
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await api(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await load();
  }

  async function bulk(action: "archive" | "unarchive" | "delete" | "restore") {
    if (selected.size === 0) return;
    const verb = { archive: "Suspend", unarchive: "Unsuspend", delete: "Delete", restore: "Restore" }[action];
    if (!confirm(`${verb} ${selected.size} user${selected.size === 1 ? "" : "s"}?`))
      return;
    await api("/admin/users/bulk", {
      method: "POST",
      body: JSON.stringify({ action, userIds: Array.from(selected) }),
    });
    setSelected(new Set());
    await load();
  }

  const allSelected = useMemo(
    () => items.length > 0 && items.every((u) => selected.has(u.id)),
    [items, selected]
  );

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((u) => u.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
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

      {selected.size > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-900 p-2.5 text-sm text-white shadow-pop">
          <span className="px-2 font-medium">
            {selected.size} selected
          </span>
          <div className="flex flex-wrap gap-1.5">
            <BulkButton onClick={() => bulk("archive")}>Suspend</BulkButton>
            <BulkButton onClick={() => bulk("unarchive")}>Unsuspend</BulkButton>
            <BulkButton onClick={() => bulk("restore")}>Restore</BulkButton>
            <BulkButton
              onClick={() => bulk("delete")}
              tone="danger"
            >
              Delete
            </BulkButton>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-100 text-left text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-surface-300"
                    aria-label="Select all"
                  />
                </th>
                <th className="p-3">User</th>
                <th className="p-3">Phone</th>
                <th className="p-3">ZIP</th>
                <th className="p-3">Signed up</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink-500">
                    No users match.
                  </td>
                </tr>
              )}
              {items.map((u) => (
                <tr
                  key={u.id}
                  className={`border-t border-surface-200 ${u.is_deleted ? "opacity-50" : ""}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleOne(u.id)}
                      className="h-4 w-4 rounded border-surface-300"
                      aria-label={`Select ${u.display_name}`}
                    />
                  </td>
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
                    {u.phone_e164 ? (
                      <div className="text-ink-700">{u.phone_e164}</div>
                    ) : (
                      <span className="text-xs text-ink-400">none</span>
                    )}
                  </td>
                  <td className="p-3">
                    {u.home_zip ? (
                      <span className="font-mono text-ink-700">{u.home_zip}</span>
                    ) : (
                      <span className="text-xs text-ink-400">none</span>
                    )}
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
                      <button
                        type="button"
                        onClick={() => setEditing(u)}
                        className="inline-flex items-center gap-1 rounded-lg bg-ink-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-800"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={2.5} />
                        Edit
                      </button>
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
                          className="rounded-lg bg-surface-100 px-2 py-1 text-xs font-medium text-ink-700 hover:bg-surface-200"
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

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function BulkButton({
  onClick,
  children,
  tone = "default",
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-white/10 hover:bg-white/20";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1 text-xs font-semibold text-white ${cls}`}
    >
      {children}
    </button>
  );
}

// ============================================================
// Edit modal
// ============================================================

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [email, setEmail] = useState(user.email);
  const [phoneE164, setPhoneE164] = useState(user.phone_e164 ?? "");
  const [homeZip, setHomeZip] = useState(user.home_zip ?? "");
  const [isAdmin, setIsAdmin] = useState(user.is_admin === 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const changes: Record<string, unknown> = {};
      if (displayName.trim() !== user.display_name)
        changes.displayName = displayName.trim();
      if (email.trim() !== user.email) changes.email = email.trim();
      if (phoneE164 !== (user.phone_e164 ?? ""))
        changes.phoneE164 = phoneE164 || "";
      if (homeZip !== (user.home_zip ?? ""))
        changes.homeZip = homeZip || "";
      if (isAdmin !== (user.is_admin === 1)) changes.isAdmin = isAdmin;
      if (Object.keys(changes).length === 0) {
        onSaved();
        return;
      }
      await api(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      onSaved();
    } catch (e: any) {
      const code = e?.body?.error;
      setError(
        code === "email_in_use"
          ? "That email is already used by another account."
          : code === "cannot_demote_self"
            ? "You can't remove your own admin status."
            : code === "cannot_delete_self"
              ? "You can't delete yourself."
              : (e?.body?.error ?? e?.message ?? "Save failed")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-lg p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink-900">Edit user</h2>
            <p className="mt-1 text-xs text-ink-500">
              Changes to email or admin toggle sign them out of every browser.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-500 hover:bg-surface-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="mt-4 space-y-3"
        >
          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              minLength={2}
              maxLength={60}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Phone (E.164, e.g. +15551234567)">
            <input
              value={phoneE164}
              onChange={(e) => setPhoneE164(e.target.value.trim())}
              className="input"
              placeholder="+15551234567 — or blank to clear"
            />
          </Field>
          <Field label="Home ZIP">
            <input
              value={homeZip}
              onChange={(e) =>
                setHomeZip(e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              className="input"
              placeholder="85003 — or blank to clear"
              inputMode="numeric"
            />
          </Field>
          <label className="flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-surface-300"
            />
            <span className="flex items-center gap-1.5 font-medium">
              {isAdmin ? (
                <ShieldCheck className="h-4 w-4 text-brand-700" />
              ) : (
                <ShieldOff className="h-4 w-4 text-ink-400" />
              )}
              Admin
            </span>
            <span className="ml-auto text-xs text-ink-500">
              Grants access to /admin.
            </span>
          </label>
          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="btn-brand"
            >
              <Save className="h-4 w-4" strokeWidth={2} />
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
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
