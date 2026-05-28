import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";

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
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Two-factor verification</h1>
      <p className="mt-1 text-sm text-neutral-600">
        We texted a 6-digit code{hint ? ` to ${hint}` : ""}. Enter it below.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded border border-neutral-300 px-3 py-3 text-center text-2xl tracking-[0.5em]"
          placeholder="••••••"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="w-full rounded bg-brand text-white py-2.5 disabled:opacity-50"
        >
          {busy ? "Verifying…" : "Verify and sign in"}
        </button>
      </form>
    </div>
  );
}
