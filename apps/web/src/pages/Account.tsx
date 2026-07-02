import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, ShieldCheck } from "lucide-react";
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
          Optional. Adding a verified phone earns you a trust badge but is
          never required to trade.
        </p>
        <div className="mt-4 flex items-center gap-3">
          {me.phoneE164 ? (
            <>
              <span className="font-mono text-sm text-ink-900">
                {me.phoneE164}
              </span>
              {me.phoneVerifiedAt ? (
                <span className="chip-brand">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="chip bg-amber-50 text-amber-800">
                  Unverified
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-ink-400">
              No phone on file.
            </span>
          )}
        </div>
      </section>
    </Container>
  );
}
