import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import Turnstile from "../components/Turnstile.js";
import { AuthLayout } from "../ui/AuthLayout.js";

const TOS_VERSION = "2026-05-28";

export default function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+1");
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
        <Field label="Mobile number" hint="E.164, e.g. +14155551234">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
            pattern="^\+[1-9]\d{7,14}$"
            autoComplete="tel"
            inputMode="tel"
          />
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
