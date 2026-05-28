import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{
        step: "verify_2fa" | "verify_phone";
        challengeId: string;
        phoneHint?: string;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          turnstileToken: "dev-bypass",
        }),
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
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-brand text-white py-2.5 disabled:opacity-50"
        >
          {busy ? "Sending code…" : "Sign in (SMS 2FA next)"}
        </button>
      </form>
    </div>
  );
}
