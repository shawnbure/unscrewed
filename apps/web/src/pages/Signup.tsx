import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import Turnstile from "../components/Turnstile.js";
import { AuthLayout } from "../ui/AuthLayout.js";
import { useSession } from "../lib/session.js";
import {
  getStoredAttribution,
  recordProposalIntent,
} from "../lib/attribution.js";
import { safeNextPath, withNext } from "../lib/navigation.js";

const TOS_VERSION = "2026-07-18";

function formatUsPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
function toE164Us(display: string): string {
  const d = display.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+1${d}` : "";
}

export default function Signup() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useSession();
  const hasExplicitNext = searchParams.has("next");
  const nextPath = safeNextPath(searchParams);
  const postSignupPath = hasExplicitNext
    ? nextPath
    : "/neighborhood?welcome=1";
  const returningMemberPath = hasExplicitNext ? nextPath : "/neighborhood";
  const nextUrl = new URL(nextPath, window.location.origin);
  const suggestedZip =
    searchParams.get("zip") ?? nextUrl.searchParams.get("zip") ?? "";
  const continuesToPost = nextUrl.pathname === "/post";
  const continuesToRemotePost =
    continuesToPost && nextUrl.searchParams.get("starter") === "remote_skill";
  const continuesToProposal =
    nextUrl.pathname.startsWith("/listing/") &&
    nextUrl.searchParams.get("propose") === "1";
  const proposalListingId = continuesToProposal
    ? nextUrl.pathname.split("/")[2]
    : undefined;
  const continuesToRemoteProposal =
    continuesToProposal &&
    searchParams.get("exchange") === "remote" &&
    /^[0-9a-f-]{36}$/i.test(proposalListingId ?? "");
  const continuesToLocalWatch =
    nextUrl.pathname === "/account" && nextUrl.hash === "#local-watch";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [homeZip, setHomeZip] = useState(
    /^\d{5}$/.test(suggestedZip) ? suggestedZip : ""
  );
  const [accepted, setAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (continuesToProposal && proposalListingId) {
      recordProposalIntent(proposalListingId);
    }
  }, [continuesToProposal, proposalListingId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!turnstileToken) {
      setError("Please complete the bot check");
      return;
    }
    if (
      (!continuesToRemoteProposal || homeZip.length > 0) &&
      !/^\d{5}$/.test(homeZip)
    ) {
      setError("Enter your 5-digit US ZIP code.");
      return;
    }
    // Phone is optional. If the user typed something, coerce to E.164 — if
    // it comes back empty, treat it as if they left the field blank.
    const phone = phoneDisplay.trim() ? toE164Us(phoneDisplay) : "";
    if (phoneDisplay.trim() && !phone) {
      setError("If you enter a phone, it must be a 10-digit US number.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          phone: phone || undefined,
          homeZip: homeZip || undefined,
          proposalListingId:
            continuesToRemoteProposal ? proposalListingId : undefined,
          displayName,
          tosVersion: TOS_VERSION,
          tosAccepted: true,
          turnstileToken,
          attribution: getStoredAttribution(),
        }),
      });
      await refresh();
      nav(postSignupPath);
    } catch (e: any) {
      setError(e?.body?.message ?? e?.body?.error ?? e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        continuesToRemotePost
          ? "Then you’ll go straight to an editable nationwide remote-skill offer. Your home ZIP anchors your optional local circle, but it will not appear on the remote listing. Phone is optional."
          : continuesToPost
            ? "Then you’ll go straight to posting your first trade. Phone is optional."
          : continuesToProposal
            ? continuesToRemoteProposal
              ? "Then you’ll return to this nationwide remote trade to make your proposal. ZIP and phone are optional. You can propose immediately; email verification only turns on trade alerts."
              : "Then you’ll return to this trade to make your proposal. You can propose immediately; email verification only turns on trade alerts. Phone is optional."
            : continuesToLocalWatch
              ? "Then you can choose whether to watch for new listings near your home ZIP. Local-listing emails are off until you turn them on."
              : "Then we’ll show your local trade circle and the first useful action. We’ll ask you to verify your email for trade alerts; phone is optional."
      }
      footer={
        <>
          Already a member?{" "}
          <Link
            to={withNext("/login", returningMemberPath)}
            className="font-medium text-brand-700 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Display name">
          <input
            required
            minLength={2}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
            autoComplete="nickname"
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            autoComplete="email"
          />
        </Field>
        <Field label="Password" hint="12 characters minimum.">
          <input
            required
            type="password"
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            autoComplete="new-password"
          />
        </Field>
        <Field
          label={
            continuesToRemoteProposal
              ? "ZIP code (optional for this remote trade)"
              : continuesToRemotePost
                ? "Home ZIP (not shown on the remote offer)"
              : "ZIP code"
          }
          hint={
            continuesToRemoteProposal
              ? "Skip this for now if you only want to make the remote proposal. You can add a ZIP later to join a local circle; nobody sees your exact ZIP but you."
              : continuesToRemotePost
                ? "Required for your account’s optional local circle and privacy-coarsened community map. The remote offer itself is available across the United States and does not display this ZIP."
              : "US 5-digit ZIP only. Used to place you on the community map in aggregate — nobody sees your exact ZIP but you."
          }
        >
          <input
            required={!continuesToRemoteProposal}
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={homeZip}
            onChange={(e) => setHomeZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="input"
            autoComplete="postal-code"
            placeholder="85003"
          />
        </Field>
        <Field
          label="Mobile number (optional)"
          hint="Contact info only. We never text you, never verify it, never sell or market to it. Feel free to skip."
        >
          <div className="flex items-center gap-2 rounded-xl border border-surface-300 bg-white px-3 py-2 focus-within:border-ink-900 focus-within:ring-4 focus-within:ring-ink-900/10">
            <span className="select-none text-sm text-ink-400">🇺🇸</span>
            <input
              value={phoneDisplay}
              onChange={(e) => setPhoneDisplay(formatUsPhoneDisplay(e.target.value))}
              className="flex-1 bg-transparent text-ink-900 placeholder:text-ink-400 focus:outline-none"
              placeholder="(555) 123-4567 — optional"
              autoComplete="tel-national"
              inputMode="tel"
              maxLength={14}
            />
          </div>
        </Field>
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            I am at least <strong>18 years old</strong> and I agree to the{" "}
            <Link to="/tos" className="text-brand-700 underline">
              Terms of Service
            </Link>
            , including indemnification and the prohibited-content rules in
            §9. I understand unscrewed.lol isn't a party to any trade I make.
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
          className="btn-primary w-full"
        >
          {busy
            ? "Creating account…"
            : continuesToPost
              ? "Create account and post"
              : continuesToProposal
                ? "Create account and propose"
                : continuesToLocalWatch
                  ? "Create account and choose alerts"
                  : "Create account and see my area"}
        </button>
      </form>
    </AuthLayout>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </label>
  );
}
