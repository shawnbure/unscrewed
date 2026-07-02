import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import Turnstile from "../components/Turnstile.js";
import { AuthLayout } from "../ui/AuthLayout.js";

const TOS_VERSION = "2026-05-28";

// Format raw digits as "(NNN) NNN-NNNN" for display.
function formatUsPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// Pull just the digits and prepend +1 for E.164.
function toE164Us(display: string): string {
  const d = display.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+1${d}` : "";
}

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!turnstileToken) {
      setError("Please complete the bot check");
      return;
    }
    const phone = toE164Us(phoneDisplay);
    if (!phone) {
      setError("Enter a valid 10-digit US mobile number.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ challengeId: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          phone,
          displayName,
          tosVersion: TOS_VERSION,
          tosAccepted: true,
          turnstileToken,
        }),
      });
      nav(`/signup/verify?cid=${encodeURIComponent(r.challengeId)}`);
    } catch (e: any) {
      setError(e?.body?.message ?? e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="We'll text a 6-digit code to verify your phone."
      footer={
        <>
          Already a member?{" "}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Display name">
          <input
            required
            minLength={2}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
            autoComplete="nickname"
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            autoComplete="email"
          />
        </Field>
        <Field label="Password" hint="12 characters minimum.">
          <input
            required
            type="password"
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            autoComplete="new-password"
          />
        </Field>
        <Field
          label="Mobile number"
          hint="US mobile only for now. We'll text you a 6-digit code."
        >
          <div className="flex items-center gap-2 rounded-xl border border-surface-300 bg-white px-3 py-2 focus-within:border-ink-900 focus-within:ring-4 focus-within:ring-ink-900/10">
            <span className="select-none text-sm text-ink-400">🇺🇸</span>
            <input
              required
              value={phoneDisplay}
              onChange={(e) =>
                setPhoneDisplay(formatUsPhoneDisplay(e.target.value))
              }
              className="flex-1 bg-transparent text-ink-900 placeholder:text-ink-400 focus:outline-none"
              placeholder="(555) 123-4567"
              autoComplete="tel-national"
              inputMode="tel"
              maxLength={14}
            />
          </div>
        </Field>
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            I agree to the{" "}
            <Link to="/tos" className="text-brand-700 underline">
              Terms of Service
            </Link>
            , including indemnification. I understand unscrewed.lol isn't a
            party to any trade I make.
          </span>
        </label>
        <Turnstile
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
          onError={() => setTurnstileToken(null)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!accepted || busy || !turnstileToken}
          className="btn-primary w-full"
        >
          {busy ? "Sending code…" : "Create account & send SMS"}
        </button>
      </form>
    </AuthLayout>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </label>
  );
}
