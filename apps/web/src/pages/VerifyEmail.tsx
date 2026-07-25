import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailCheck } from "lucide-react";
import { api } from "../lib/api.js";
import { Container } from "../ui/Container.js";

type VerificationState = {
  email: string;
  verified: boolean;
};

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const query = new URLSearchParams({
    u: params.get("u") ?? "",
    t: params.get("t") ?? "",
  }).toString();
  const [state, setState] = useState<VerificationState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<VerificationState>(`/email-verification?${query}`)
      .then(setState)
      .catch(() => setError("This verification link is invalid or expired."));
  }, [query]);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await api(`/email-verification?${query}`, { method: "POST" });
      setState((current) =>
        current ? { ...current, verified: true } : current
      );
    } catch {
      setError("We could not verify this address. Please request a new link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container size="sm" className="py-12">
      <section className="card p-7">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-700">
          <MailCheck className="h-5 w-5" strokeWidth={2} />
        </span>
        <h1 className="display mt-5 text-3xl text-ink-900">
          Verify your email
        </h1>
        {!state && !error && (
          <div className="mt-6 h-20 animate-pulse rounded-xl bg-surface-100" />
        )}
        {state && !state.verified && (
          <>
            <p className="mt-3 text-sm leading-6 text-ink-600">
              Confirm <strong>{state.email}</strong> so unscrewed can send
              proposal, reply, and agreement-status alerts. No marketing
              email.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={verify}
              className="btn-brand mt-6"
            >
              {busy ? "Verifying…" : "Verify email address"}
            </button>
          </>
        )}
        {state?.verified && (
          <div className="mt-6 rounded-xl bg-brand-50 p-4 text-brand-800">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              Email verified
            </p>
            <p className="mt-1 text-sm">
              You can now receive alerts when neighbors contact you about a
              trade.
            </p>
          </div>
        )}
        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <p className="mt-6 text-sm text-ink-500">
          <Link to="/account" className="link">
            Return to account settings
          </Link>
        </p>
      </section>
    </Container>
  );
}
