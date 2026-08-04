import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { api } from "../lib/api.js";
import Turnstile from "../components/Turnstile.js";
import { AuthLayout } from "../ui/AuthLayout.js";
import { useSession } from "../lib/session.js";
import { passkeysSupported, signInWithPasskey } from "../lib/passkeys.js";
import { safeNextPath, withNext } from "../lib/navigation.js";

interface LoginResponse {
  ok: true;
  step: "done";
}

export default function Login() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useSession();
  const nextPath = safeNextPath(searchParams);
  const nextUrl = new URL(nextPath, window.location.origin);
  const continuesToProposal =
    nextUrl.pathname.startsWith("/listing/") &&
    nextUrl.searchParams.get("propose") === "1";
  const continuesToRemoteProposal =
    continuesToProposal && searchParams.get("exchange") === "remote";
  const continuesToLocalWatch =
    nextUrl.pathname === "/account" && nextUrl.hash === "#local-watch";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [pkSupported, setPkSupported] = useState(false);

  useEffect(() => {
    setPkSupported(passkeysSupported());
  }, []);

  const signupPath = withNext("/signup", nextPath);
  const proposalSignupPath = continuesToRemoteProposal
    ? `${signupPath}&exchange=remote`
    : signupPath;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!turnstileToken) {
      setError("Please complete the bot check");
      return;
    }
    setBusy(true);
    try {
      await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      await refresh();
      nav(nextPath);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitPasskey() {
    setError(null);
    setPasskeyBusy(true);
    try {
      await signInWithPasskey();
      await refresh();
      nav(nextPath);
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "AbortError") {
        setError("Passkey sign-in cancelled.");
      } else {
        setError(e?.body?.error ?? e?.message ?? "Passkey sign-in failed");
      }
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        continuesToProposal
          ? "Sign in, then you’ll return to this trade to make your proposal."
          : continuesToLocalWatch
            ? "Sign in, then you can review your optional local-listing alerts."
            : "Sign in with your email and password."
      }
      footer={
        <>
          New here?{" "}
          <Link
            to={proposalSignupPath}
            className="font-medium text-ink-900 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {pkSupported && (
        <>
          <button
            type="button"
            onClick={submitPasskey}
            disabled={passkeyBusy}
            className="btn-outline mb-4 w-full"
          >
            <KeyRound className="h-4 w-4" strokeWidth={2} />
            {passkeyBusy ? "Waiting for passkey…" : "Sign in with a passkey"}
          </button>
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-400">
            <span className="h-px flex-1 bg-surface-200" />
            or with email
            <span className="h-px flex-1 bg-surface-200" />
          </div>
        </>
      )}
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
