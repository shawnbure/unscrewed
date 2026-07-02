import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import Turnstile from "../components/Turnstile.js";
import { AuthLayout } from "../ui/AuthLayout.js";
import { useSession } from "../lib/session.js";

interface LoginResponse {
  ok: true;
  step: "done" | "verify_phone";
  challengeId?: string;
}

export default function Login() {
  const nav = useNavigate();
  const { refresh } = useSession();
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
      const r = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      if (r.step === "verify_phone" && r.challengeId) {
        // User signed up but never verified their phone. Bounce them to the
        // signup phone-verify page to finish.
        nav(`/signup/verify?cid=${encodeURIComponent(r.challengeId)}`);
        return;
      }
      // step === "done" — session cookie is set, just go.
      await refresh();
      nav("/browse");
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with your email and password."
      footer={
        <>
          New here?{" "}
          <Link
            to="/signup"
            className="font-medium text-ink-900 hover:underline"
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
        {error && (
          <p className="text-sm text-red-700">
            {error === "invalid_credentials"
              ? "Wrong email or password."
              : error === "account_suspended"
                ? "This account has been suspended. Contact support."
                : error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !turnstileToken}
          className="btn-primary w-full"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
