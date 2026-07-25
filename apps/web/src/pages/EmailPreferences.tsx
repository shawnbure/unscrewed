import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bell, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api.js";
import { Container } from "../ui/Container.js";

type Preferences = {
  email: string;
  enabled: boolean;
  tradeEnabled: boolean;
  localEnabled: boolean;
};

export default function EmailPreferencesPage() {
  const [params] = useSearchParams();
  const userId = params.get("u") ?? "";
  const token = params.get("t") ?? "";
  const query = new URLSearchParams({ u: userId, t: token }).toString();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Preferences>(`/email-preferences?${query}`)
      .then(setPreferences)
      .catch(() =>
        setError("This email-preferences link is invalid or no longer available.")
      );
  }, [query]);

  async function update(
    kind: "tradeEnabled" | "localEnabled",
    enabled: boolean
  ) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/email-preferences?${query}`, {
        method: "POST",
        body: JSON.stringify({ [kind]: enabled }),
      });
      setPreferences((current) =>
        current
          ? {
              ...current,
              [kind]: enabled,
              ...(kind === "tradeEnabled" ? { enabled } : {}),
            }
          : current
      );
      setSaved(true);
    } catch (e: any) {
      setError(
        e?.body?.error === "home_location_unavailable"
          ? "Add or resave a valid home ZIP in Account before turning on local-listing alerts."
          : "We could not update your preference. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container size="sm" className="py-12">
      <section className="card p-7">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-700">
          <Bell className="h-5 w-5" strokeWidth={2} />
        </span>
        <h1 className="display mt-5 text-3xl text-ink-900">
          Email preferences
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          Manage transactional trade activity and optional local-listing
          alerts independently. Neither category contains private message text,
          contract terms, exact addresses, or meetup details.
        </p>

        {!preferences && !error && (
          <div className="mt-6 h-20 animate-pulse rounded-xl bg-surface-100" />
        )}

        {preferences && (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-surface-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Account
              </p>
              <p className="mt-1 text-sm text-ink-900">{preferences.email}</p>
            </div>
            <div className="rounded-xl border border-surface-200 p-4">
              <p className="text-sm font-semibold text-ink-900">
                Trade activity
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Transactional alerts for proposals, replies, and agreement
                updates connected to your account.
              </p>
              <p className="mt-3 text-sm text-ink-700">
                Alerts are currently{" "}
                <strong>{preferences.tradeEnabled ? "on" : "off"}</strong>.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  update("tradeEnabled", !preferences.tradeEnabled)
                }
                className={
                  preferences.tradeEnabled
                    ? "btn-ghost mt-4"
                    : "btn-brand mt-4"
                }
              >
                {busy
                  ? "Saving…"
                  : preferences.tradeEnabled
                    ? "Turn off trade emails"
                    : "Turn trade emails back on"}
              </button>
            </div>
            <div className="rounded-xl border border-surface-200 p-4">
              <p className="text-sm font-semibold text-ink-900">
                New listings near home
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">
                Optional alerts for new listings within roughly 25 km of your
                home ZIP, limited to at most one local-listing email each day.
              </p>
              <p className="mt-3 text-sm text-ink-700">
                Alerts are currently{" "}
                <strong>{preferences.localEnabled ? "on" : "off"}</strong>.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  update("localEnabled", !preferences.localEnabled)
                }
                className={
                  preferences.localEnabled
                    ? "btn-ghost mt-4"
                    : "btn-brand mt-4"
                }
              >
                {busy
                  ? "Saving…"
                  : preferences.localEnabled
                    ? "Turn off local-listing emails"
                    : "Turn on local-listing emails"}
              </button>
            </div>
            {saved && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-brand-700">
                <CheckCircle2 className="h-4 w-4" />
                Preference saved.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="mt-6 text-sm text-ink-500">
          Signed in? You can also change this from your{" "}
          <Link to="/account#trade-emails" className="link">
            account settings
          </Link>
          .
        </p>
      </section>
    </Container>
  );
}
