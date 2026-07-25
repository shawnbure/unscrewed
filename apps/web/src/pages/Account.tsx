import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  KeyRound,
  Plus,
  Trash2,
  Phone,
  Save,
  Pencil,
  MapPin,
  Mail,
  User as UserIcon,
  Lock,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { Container } from "../ui/Container.js";
import {
  passkeysSupported,
  registerPasskey,
  listPasskeys,
  revokePasskey,
  type StoredPasskey,
} from "../lib/passkeys.js";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";

interface Me {
  id: string;
  email: string;
  emailVerifiedAt: number | null;
  displayName: string;
  phoneE164: string;
  phoneVerifiedAt: number | null;
  homeZip: string | null;
  tradeEmailNotifications: number;
  isAdmin: number;
  dateCreated: number;
}

export default function AccountPage() {
  const nav = useNavigate();
  const { refresh } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [passkeys, setPasskeys] = useState<StoredPasskey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pkSupported = passkeysSupported();

  const reload = useCallback(async () => {
    const [meResp, list] = await Promise.all([
      api<Me>("/me"),
      pkSupported ? listPasskeys() : Promise.resolve([] as StoredPasskey[]),
    ]);
    setMe(meResp);
    setPasskeys(list);
  }, [pkSupported]);

  useEffect(() => {
    reload().catch((e) => setError(e?.message ?? "Failed to load account"));
  }, [reload]);

  async function addPasskey() {
    setError(null);
    setBusy(true);
    try {
      await registerPasskey();
      await reload();
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "AbortError") {
        // user cancelled — silent
      } else {
        setError(e?.body?.error ?? e?.message ?? "Passkey registration failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this passkey? You can add another anytime."))
      return;
    await revokePasskey(id);
    await reload();
  }

  if (!me)
    return (
      <Container size="md" className="py-10">
        <div className="card h-40 animate-pulse" />
      </Container>
    );

  return (
    <Container size="md" className="py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
          Your account
        </p>
        <h1 className="display mt-1 text-3xl text-ink-900">
          {me.displayName}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {me.email}
          {me.isAdmin === 1 && (
            <span className="ml-2 chip-brand">admin</span>
          )}
        </p>
      </header>

      <section className="card mt-8 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink-900">
              Passkeys
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Sign in without a password using your device's biometric or
              hardware key. Nothing leaves your device.
            </p>
          </div>
          {pkSupported && (
            <button
              type="button"
              onClick={addPasskey}
              disabled={busy}
              className="btn-brand"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add passkey
            </button>
          )}
        </div>

        {!pkSupported && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Your browser doesn't support passkeys. Try a recent Safari,
            Chrome, or Edge.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {pkSupported && (
          <ul className="mt-5 space-y-2">
            {passkeys.length === 0 && (
              <li className="rounded-xl border border-dashed border-surface-300 p-4 text-center text-sm text-ink-500">
                No passkeys yet. Add one to sign in without your password.
              </li>
            )}
            {passkeys.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-surface-200 p-3"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-brand-700">
                  <KeyRound className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink-900">
                    {p.deviceLabel ?? "Passkey"}
                  </div>
                  <div className="text-xs text-ink-500">
                    Added {new Date(p.dateCreated).toLocaleDateString()}
                    {p.dateLastUsed && (
                      <>
                        {" · "}last used{" "}
                        {new Date(p.dateLastUsed).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-700"
                  aria-label="Remove passkey"
                  title="Remove passkey"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="trade-emails" className="card mt-4 p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-700">
            <Bell className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink-900">
              Trade email alerts
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Get a brief email when a neighbor sends a proposal or replies.
              No newsletters, promotions, or private message text.
            </p>
          </div>
        </div>
        <TradeEmailToggle
          enabled={me.tradeEmailNotifications === 1}
          onSaved={(enabled) =>
            setMe((prev) =>
              prev
                ? { ...prev, tradeEmailNotifications: enabled ? 1 : 0 }
                : prev
            )
          }
        />
      </section>

      <section className="card mt-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Phone</h2>
        <p className="mt-0.5 text-sm text-ink-500">
          Optional profile field. We never text you, never verify it, never
          sell or market to it. This is only shown to counter-parties in a
          trade if you choose to share it during a negotiation.
        </p>
        <PhoneEditor
          initial={me.phoneE164}
          onSaved={(next) =>
            setMe((prev) => (prev ? { ...prev, phoneE164: next } : prev))
          }
        />
      </section>

      <section className="card mt-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Home ZIP</h2>
        <p className="mt-0.5 text-sm text-ink-500">
          Used only to place you on the community map in aggregate — nobody
          sees your exact ZIP but you.
        </p>
        <ZipEditor
          initial={me.homeZip ?? ""}
          onSaved={(next) =>
            setMe((prev) => (prev ? { ...prev, homeZip: next } : prev))
          }
        />
      </section>

      <section className="card mt-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">
          Display name
        </h2>
        <p className="mt-0.5 text-sm text-ink-500">
          What other traders see when you propose or list.
        </p>
        <NameEditor
          initial={me.displayName}
          onSaved={(next) =>
            setMe((prev) => (prev ? { ...prev, displayName: next } : prev))
          }
        />
      </section>

      <section className="card mt-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Email</h2>
        <p className="mt-0.5 text-sm text-ink-500">
          Your sign-in identifier. Changing it invalidates every other
          browser you're signed in from.
        </p>
        <EmailEditor
          initial={me.email}
          verified={me.emailVerifiedAt !== null}
          onSaved={(next, emailVerifiedAt) =>
            setMe((prev) =>
              prev ? { ...prev, email: next, emailVerifiedAt } : prev
            )
          }
          onVerified={() =>
            setMe((prev) =>
              prev ? { ...prev, emailVerifiedAt: Date.now() } : prev
            )
          }
        />
      </section>

      <section className="card mt-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Password</h2>
        <p className="mt-0.5 text-sm text-ink-500">
          Changing your password signs you out of every other browser.
        </p>
        <PasswordEditor />
      </section>

      <section className="mt-8 rounded-2xl border-2 border-red-200 bg-red-50/40 p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-red-800">
              Danger zone
            </h2>
            <p className="mt-1 text-sm text-red-700">
              Delete your account. Your listings and negotiations will be
              soft-deleted along with you — an admin can restore later if you
              change your mind, but nobody will see them once you're gone.
            </p>
          </div>
        </div>
        <DeleteAccount
          onDeleted={async () => {
            await refresh();
            nav("/");
          }}
        />
      </section>
    </Container>
  );
}

// ============================================================
// Editors
// ============================================================

function TradeEmailToggle({
  enabled,
  onSaved,
}: {
  enabled: boolean;
  onSaved: (enabled: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api("/me/trade-email-notifications", {
        method: "PATCH",
        body: JSON.stringify({ enabled: next }),
      });
      onSaved(next);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Could not update alerts");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-800">
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(event) => update(event.target.checked)}
          className="h-4 w-4 rounded border-surface-300 text-brand-700 focus:ring-brand-500"
        />
        Email me about new trade activity
        {busy && <span className="text-xs text-ink-500">Saving…</span>}
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function NameEditor({
  initial,
  onSaved,
}: {
  initial: string;
  onSaved: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (!editing) setName(initial);
  }, [initial, editing]);
  async function save() {
    setError(null);
    if (name.trim().length < 2) {
      setError("At least 2 characters.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ displayName: string }>("/me/name", {
        method: "PATCH",
        body: JSON.stringify({ displayName: name.trim() }),
      });
      onSaved(r.displayName);
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 3000);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }
  if (!editing) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-ink-400" strokeWidth={2} />
          <span className="text-sm text-ink-900">{initial}</span>
          {savedFlash && <span className="chip-brand ml-1">✓ Saved</span>}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setName(initial);
          }}
          className="btn-ghost text-sm"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Edit
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <input
        maxLength={60}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input"
        placeholder="Your display name"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-brand text-sm"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={2} />
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmailEditor({
  initial,
  verified,
  onSaved,
  onVerified,
}: {
  initial: string;
  verified: boolean;
  onSaved: (next: string, emailVerifiedAt: number | null) => void;
  onVerified: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(initial);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null
  );

  async function resendVerification() {
    setBusy(true);
    setError(null);
    setVerificationStatus(null);
    try {
      const result = await api<{ verified: boolean; sent?: boolean }>(
        "/email-verification/resend",
        { method: "POST" }
      );
      if (result.verified) {
        onVerified();
        setVerificationStatus("Already verified.");
      } else {
        setVerificationStatus(
          result.sent
            ? "Verification email sent. Check your inbox."
            : "A verification email was sent recently. Check your inbox."
        );
      }
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Could not send verification");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (!password) {
      setError("Enter your current password to confirm.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{
        email: string;
        emailVerifiedAt: number | null;
      }>("/me/email", {
        method: "PATCH",
        body: JSON.stringify({ email, currentPassword: password }),
      });
      onSaved(r.email, r.emailVerifiedAt);
      setPassword("");
      setEditing(false);
    } catch (e: any) {
      const code = e?.body?.error;
      setError(
        code === "invalid_password"
          ? "Wrong password."
          : code === "email_in_use"
            ? "That email is already in use."
            : (e?.body?.error ?? e?.message ?? "Save failed")
      );
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-ink-400" strokeWidth={2} />
            <span className="text-sm text-ink-900">{initial}</span>
            <span className={verified ? "chip-brand" : "chip"}>
              {verified ? "verified" : "unverified"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setEmail(initial);
              setPassword("");
            }}
            className="btn-ghost text-sm"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Edit
          </button>
        </div>
        {!verified && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Verify this address before unscrewed sends trade activity alerts.
            <button
              type="button"
              onClick={resendVerification}
              disabled={busy}
              className="ml-2 font-semibold underline"
            >
              {busy ? "Sending…" : "Send verification email"}
            </button>
          </div>
        )}
        {verificationStatus && (
          <p className="mt-2 text-sm text-brand-700">{verificationStatus}</p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
        placeholder="you@example.com"
        autoComplete="email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input"
        placeholder="Current password"
        autoComplete="current-password"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-brand text-sm"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={2} />
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PasswordEditor() {
  const [editing, setEditing] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    setError(null);
    setOk(false);
    if (newPw.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }
    if (newPw === oldPw) {
      setError("Choose something different from your current password.");
      return;
    }
    setBusy(true);
    try {
      await api("/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: oldPw, newPassword: newPw }),
      });
      setOldPw("");
      setNewPw("");
      setEditing(false);
      setOk(true);
      setTimeout(() => setOk(false), 5000);
    } catch (e: any) {
      const code = e?.body?.error;
      setError(
        code === "invalid_password"
          ? "Wrong current password."
          : code === "same_password"
            ? "Choose something different from your current password."
            : (e?.body?.error ?? e?.message ?? "Save failed")
      );
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-ink-400" strokeWidth={2} />
          <span className="text-sm text-ink-500">••••••••••••</span>
          {ok && (
            <span className="chip-brand ml-1">Updated</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn-ghost text-sm"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Change
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <input
        type="password"
        value={oldPw}
        onChange={(e) => setOldPw(e.target.value)}
        className="input"
        placeholder="Current password"
        autoComplete="current-password"
      />
      <input
        type="password"
        value={newPw}
        onChange={(e) => setNewPw(e.target.value)}
        className="input"
        placeholder="New password (12+ characters)"
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-brand text-sm"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={2} />
          {busy ? "Saving…" : "Change password"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
            setOldPw("");
            setNewPw("");
          }}
          className="btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setError(null);
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    setBusy(true);
    try {
      await api("/me", {
        method: "DELETE",
        body: JSON.stringify({ currentPassword: password }),
      });
      onDeleted();
    } catch (e: any) {
      const code = e?.body?.error;
      setError(
        code === "invalid_password"
          ? "Wrong password."
          : (e?.body?.error ?? e?.message ?? "Delete failed")
      );
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-4 rounded-xl border-2 border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
      >
        <Trash2 className="mr-1.5 inline h-4 w-4" strokeWidth={2} />
        Delete my account
      </button>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-red-800">
        Enter your current password to confirm. This soft-deletes your
        account — an admin can undo it, but you'll be signed out
        immediately.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input border-red-300 focus:border-red-500 focus:ring-red-500/10"
        placeholder="Your password"
        autoComplete="current-password"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Yes, delete my account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setPassword("");
            setError(null);
          }}
          className="btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ZipEditor({
  initial,
  onSaved,
}: {
  initial: string;
  onSaved: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [zip, setZip] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Sync local input value with the latest server value whenever the parent
  // hands us a fresh `initial`. Fixes the classic "state initialized from
  // props" pitfall so what the user sees always reflects the source of truth.
  useEffect(() => {
    if (!editing) setZip(initial);
  }, [initial, editing]);

  async function save() {
    setError(null);
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a valid 5-digit US ZIP.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ homeZip: string }>("/me/zip", {
        method: "PATCH",
        body: JSON.stringify({ homeZip: zip }),
      });
      onSaved(r.homeZip);
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 3000);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-ink-400" strokeWidth={2} />
          {initial ? (
            <span className="font-mono text-sm text-ink-900">{initial}</span>
          ) : (
            <span className="text-sm text-ink-400">No ZIP on file.</span>
          )}
          {savedFlash && (
            <span className="chip-brand ml-1">✓ Saved</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setZip(initial);
          }}
          className="btn-ghost text-sm"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          {initial ? "Edit" : "Add ZIP"}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <input
        inputMode="numeric"
        pattern="\d{5}"
        maxLength={5}
        value={zip}
        onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
        className="input"
        placeholder="85003"
        autoComplete="postal-code"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-brand text-sm"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={2} />
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PhoneEditor({
  initial,
  onSaved,
}: {
  initial: string;
  onSaved: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [display, setDisplay] = useState(initial ? fromE164Us(initial) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    if (!editing) setDisplay(initial ? fromE164Us(initial) : "");
  }, [initial, editing]);

  async function save() {
    setError(null);
    const trimmed = display.trim();
    const phone = trimmed ? toE164Us(trimmed) : "";
    if (trimmed && !phone) {
      setError("Enter a valid 10-digit US mobile number, or clear the field.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ phoneE164: string }>("/me/phone", {
        method: "PATCH",
        body: JSON.stringify({ phone }),
      });
      onSaved(r.phoneE164);
      setDisplay(r.phoneE164 ? fromE164Us(r.phoneE164) : "");
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 3000);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-ink-400" strokeWidth={2} />
          {initial ? (
            <span className="font-mono text-sm text-ink-900">{initial}</span>
          ) : (
            <span className="text-sm text-ink-400">No phone on file.</span>
          )}
          {savedFlash && <span className="chip-brand ml-1">✓ Saved</span>}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setDisplay(initial ? fromE164Us(initial) : "");
          }}
          className="btn-ghost text-sm"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          {initial ? "Edit" : "Add phone"}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-surface-300 bg-white px-3 py-2 focus-within:border-ink-900 focus-within:ring-4 focus-within:ring-ink-900/10">
        <span className="select-none text-sm text-ink-400">🇺🇸</span>
        <input
          value={display}
          onChange={(e) => setDisplay(formatUsPhoneDisplay(e.target.value))}
          className="flex-1 bg-transparent text-ink-900 placeholder:text-ink-400 focus:outline-none"
          placeholder="(555) 123-4567 — leave blank to clear"
          autoComplete="tel-national"
          inputMode="tel"
          maxLength={14}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-brand text-sm"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={2} />
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function formatUsPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
function toE164Us(display: string): string {
  const d = display.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+1${d}` : "";
}
function fromE164Us(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? formatUsPhoneDisplay(d) : e164;
}
