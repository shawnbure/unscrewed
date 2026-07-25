import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MailWarning } from "lucide-react";
import { api } from "../lib/api.js";
import { Container } from "./Container.js";

interface TradeAlertReadinessBannerProps {
  authenticated: boolean;
}

interface AlertReadiness {
  emailVerifiedAt: number | null;
  tradeEmailNotifications: number;
}

export function TradeAlertReadinessBanner({
  authenticated,
}: TradeAlertReadinessBannerProps) {
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      setNeedsVerification(false);
      return;
    }

    let active = true;
    const load = () => {
      api<AlertReadiness>("/me")
        .then((me) => {
          if (!active) return;
          setNeedsVerification(
            me.tradeEmailNotifications === 1 &&
              me.emailVerifiedAt === null
          );
        })
        .catch(() => {
          if (active) setNeedsVerification(false);
        });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [authenticated]);

  if (!needsVerification) return null;

  return (
    <aside
      className="border-b border-amber-200 bg-amber-50"
      aria-label="Trade alert readiness"
    >
      <Container
        size="xl"
        className="flex flex-col gap-2 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-2">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p>
            <strong>Verify your email before sharing a listing.</strong>{" "}
            Otherwise a real proposal will not produce an email alert. The
            persistent My trades badge still appears when you return.
            Transactional emails omit offers, messages, terms, and meetup
            details.
          </p>
        </div>
        <Link
          to="/account#email"
          className="shrink-0 font-semibold text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-ink-900"
        >
          Verify email
        </Link>
      </Container>
    </aside>
  );
}
