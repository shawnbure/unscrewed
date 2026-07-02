import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";
import { AuthLayout } from "../ui/AuthLayout.js";

export default function TwoFactor() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { refresh } = useSession();
  const challengeId = sp.get("cid") ?? "";
  const hint = sp.get("hint") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId, code }),
      });
      await refresh();
      nav("/browse");
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Two-factor verification"
      subtitle={`Enter the 6-digit code we texted${hint ? ` to ${hint}` : ""}.`}
    >
      <form onSubmit={submit} className="space-y-4">
        <input
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="input text-center text-2xl tracking-[0.5em]"
          placeholder="••••••"
          autoComplete="one-time-code"
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="btn-primary w-full"
        >
          {busy ? "Verifying…" : "Verify and sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
