import { useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { api } from "../lib/api.js";
import { ShareCompletedTrade } from "./ShareCompletedTrade.js";

interface TradeCompletionProps {
  contractId: string;
  mineCompletedAt: number | null | undefined;
  otherCompletedAt: number | null | undefined;
  partyACompletedAt: number | null;
  partyBCompletedAt: number | null;
  onConfirmed: () => Promise<void> | void;
}

export function TradeCompletion({
  contractId,
  mineCompletedAt,
  otherCompletedAt,
  partyACompletedAt,
  partyBCompletedAt,
  onConfirmed,
}: TradeCompletionProps) {
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completed = Boolean(partyACompletedAt && partyBCompletedAt);

  async function confirmCompletion() {
    if (
      !window.confirm(
        "Confirm that the real-world exchange happened and you completed your side? This confirmation cannot be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/contracts/${encodeURIComponent(contractId)}/complete`, {
        method: "POST",
      });
      setRecorded(true);
      try {
        await onConfirmed();
      } catch {
        setError(
          "Your completion was recorded, but the trade did not refresh. Reload; do not confirm again."
        );
      }
    } catch (e: any) {
      setError(
        e?.body?.error === "agreement_not_signed"
          ? "Both people must sign the agreement first."
          : e?.body?.error ?? e?.message ?? "Could not confirm completion."
      );
    } finally {
      setBusy(false);
    }
  }

  if (completed) {
    return (
      <div className="rounded-xl bg-brand-50 p-3 text-center text-xs text-brand-700">
        <p className="inline-flex items-center gap-1.5 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          Both traders confirmed the exchange happened.
        </p>
        <ShareCompletedTrade />
      </div>
    );
  }

  if (mineCompletedAt === undefined || otherCompletedAt === undefined) {
    return (
      <p className="rounded-xl bg-surface-50 p-3 text-xs text-ink-500">
        Trade agreed. Completion controls will appear when your account finishes
        loading.
      </p>
    );
  }

  if (mineCompletedAt) {
    return (
      <div className="rounded-xl bg-surface-50 p-3 text-xs text-ink-600">
        <p className="inline-flex items-center gap-1.5 font-semibold text-ink-800">
          <Clock3 className="h-4 w-4" />
          You confirmed your side.
        </p>
        <p className="mt-1">
          Waiting for the other trader. This is not counted or shared as a
          completed trade yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-900">
      <p className="font-semibold">
        {otherCompletedAt
          ? "The other trader confirmed completion."
          : "After the real exchange happens"}
      </p>
      <p className="mt-1 leading-relaxed">
        Confirm only after you have actually given and received what the signed
        agreement says. Both people must confirm before this counts as a
        completed trade. Your confirmation cannot be undone.
      </p>
      <button
        type="button"
        onClick={confirmCompletion}
        disabled={busy || recorded}
        className="btn-brand mt-3 w-full"
      >
        <CheckCircle2 className="h-4 w-4" />
        {busy
          ? "Confirming…"
          : recorded
            ? "Completion recorded"
            : "Confirm my side is complete"}
      </button>
      {error && (
        <p className="mt-2 text-red-700" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
