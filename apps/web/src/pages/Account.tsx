import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Phone, Save, Pencil, MapPin } from "lucide-react";
import { Container } from "../ui/Container.js";
import {
  passkeysSupported,
  registerPasskey,
  listPasskeys,
  revokePasskey,
  type StoredPasskey,
} from "../lib/passkeys.js";
import { api } from "../lib/api.js";

interface Me {
  id: string;
  email: string;
  displayName: string;
  phoneE164: string;
  phoneVerifiedAt: number | null;
  homeZip: string | null;
  isAdmin: number;
  dateCreated: number;
}

export default function AccountPage() {
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

      <section className="card mt-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Phone</h2>
        <p className="mt-0.5 text-sm text-ink-500">
          Optional profile field. We never text you, never verify it, never
          sell or market to it. This is only shown to counter-parties in a
          trade if you choose to share it during a negotiation.
        </p>
        <PhoneEditor
          initial={me.phoneE164}
          onSaved={(next) => setMe({ ...me, phoneE164: next })}
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
          onSaved={(next) => setMe({ ...me, homeZip: next })}
        />
      </section>
    </Container>
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
