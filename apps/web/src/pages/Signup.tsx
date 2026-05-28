import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import Turnstile from "../components/Turnstile.js";

const TOS_VERSION = "2026-05-28"; // must match TOS_VERSION in the Worker

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
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-neutral-600">
        We'll text you a 6-digit code to verify your phone.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Display name">
          <input
            required
            minLength={2}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Password (12+ chars)">
          <input
            required
            type="password"
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Mobile (E.164, e.g. +14155551234)">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
            pattern="^\+[1-9]\d{7,14}$"
          />
        </Field>
        <label className="flex items-start gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1"
          />
          <span>
            I agree to the{" "}
            <Link to="/tos" className="text-brand underline">
              Terms of Service
            </Link>{" "}
            including the indemnification clause. I understand unscrewed.lol is
            not a party to any trade I make.
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
          className="w-full rounded bg-brand text-white py-2.5 disabled:opacity-50"
        >
          {busy ? "Sending code…" : "Create account & send SMS"}
        </button>
      </form>
      <style>{`.input { @apply w-full rounded border border-neutral-300 px-3 py-2; }`}</style>
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
      <span className="text-sm text-neutral-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
