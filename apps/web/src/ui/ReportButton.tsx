// Small "Report" affordance + confirmation modal that any signed-in user
// can use to flag a listing, blog post, or user profile. Signed-out users
// get bounced to /login.
//
// After 3 distinct reporters against the same target, the server auto-hides
// it and marks the reports "auto_hidden" for admin review.

import { useState } from "react";
import { Flag, X } from "lucide-react";
import {
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetType,
} from "@unscrewed/shared";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  className?: string;
  variant?: "chip" | "link";
}

export function ReportButton({
  targetType,
  targetId,
  className = "",
  variant = "chip",
}: Props) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);

  function launch() {
    if (!session?.authenticated) {
      window.location.href = "/login";
      return;
    }
    setOpen(true);
  }

  const base =
    variant === "link"
      ? "inline-flex items-center gap-1 text-xs text-ink-400 hover:text-red-600"
      : "inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-ink-500 hover:bg-red-50 hover:text-red-700";

  return (
    <>
      <button
        type="button"
        onClick={launch}
        className={`${base} ${className}`}
        title="Report this"
      >
        <Flag className="h-3.5 w-3.5" strokeWidth={2} />
        Report
      </button>
      {open && (
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);
  const [already, setAlready] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Pick a reason.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api<{
        ok: true;
        autoHidden?: boolean;
        alreadyReported?: boolean;
      }>("/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          notes: notes.trim() || undefined,
        }),
      });
      setDone(true);
      setAutoHidden(!!r.autoHidden);
      setAlready(!!r.alreadyReported);
    } catch (e: any) {
      const code = e?.body?.error;
      setError(
        code === "cannot_report_self"
          ? "You can't report your own account."
          : code === "target_missing"
            ? "That target no longer exists."
            : (e?.body?.error ?? e?.message ?? "Report failed")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-ink-900">Report this content</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-500 hover:bg-surface-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink-700">
              {already
                ? "You already reported this — nothing changed. An admin will still review."
                : autoHidden
                  ? "Thanks. Enough people flagged this that it's now hidden pending review."
                  : "Thanks — we've logged the report. An admin will review shortly."}
            </p>
            <p className="text-xs text-ink-500">
              If the content shows suspected child sexual abuse material,
              please also report to{" "}
              <a
                href="https://report.cybertip.org/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink-900"
              >
                NCMEC's CyberTipline
              </a>
              . We report automatically at the platform level too.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary w-full"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-xs text-ink-500">
              Reports are confidential. Multiple independent reports auto-hide
              the content pending admin review.
            </p>
            <label className="block">
              <span className="label">Reason</span>
              <div className="mt-1 space-y-1">
                {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map(
                  (r) => (
                    <label
                      key={r}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        reason === r
                          ? "border-red-500 bg-red-50 text-red-900"
                          : "border-surface-200 text-ink-700 hover:border-red-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="h-4 w-4 accent-red-600"
                      />
                      <span>{REPORT_REASON_LABELS[r]}</span>
                    </label>
                  )
                )}
              </div>
            </label>
            <label className="block">
              <span className="label">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                className="input mt-1"
                placeholder="Any specifics that help the reviewer."
              />
            </label>
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !reason}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Flag className="h-4 w-4" strokeWidth={2} />
                {busy ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
