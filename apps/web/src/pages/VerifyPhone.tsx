import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";

export default function VerifyPhone() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { refresh } = useSession();
  const challengeId = sp.get("cid") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/auth/signup/verify", {
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

  async function resend() {
    setError(null);
    try {
      const r = await api<{ challengeId: string }>("/auth/2fa/resend", {
        method: "POST",
        body: JSON.stringify({ challengeId }),
      });
      nav(`?cid=${encodeURIComponent(r.challengeId)}`, { replace: true });
    } catch (e: any) {
      setError(e?.message ?? "Resend failed");
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Verify your phone</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Enter the 6-digit code we just texted you. Code expires in 5 minutes.
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
          {busy ? "Verifying…" : "Verify"}
        </button>
        <button
          type="button"
          onClick={resend}
          className="w-full text-sm text-neutral-500 hover:text-brand"
        >
          Resend code
        </button>
      </form>
    </div>
  );
}
