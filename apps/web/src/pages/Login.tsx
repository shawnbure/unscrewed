import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import Turnstile from "../components/Turnstile.js";
import { AuthLayout } from "../ui/AuthLayout.js";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const r = await api<{
        step: "verify_2fa" | "verify_phone";
        challengeId: string;
        phoneHint?: string;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      const target = r.step === "verify_phone" ? "/signup/verify" : "/2fa";
      const qs = new URLSearchParams({ cid: r.challengeId });
      if (r.phoneHint) qs.set("hint", r.phoneHint);
      nav(`${target}?${qs.toString()}`);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to post trades, negotiate, and manage your account."
      footer={
        <>
          New here?{" "}
          <Link
            to="/signup"
            className="font-medium text-brand-700 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
            autoComplete="current-password"
          />
        </label>
        <Turnstile
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
          onError={() => setTurnstileToken(null)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !turnstileToken}
          className="btn-primary w-full"
        >
          {busy ? "Sending code…" : "Sign in — SMS code next"}
        </button>
      </form>
    </AuthLayout>
  );
}
