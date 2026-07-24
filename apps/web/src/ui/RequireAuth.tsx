import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../lib/session.js";
import { withNext } from "../lib/navigation.js";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, refresh } = useSession();
  const location = useLocation();

  useEffect(() => {
    if (!session) refresh();
  }, [session, refresh]);

  if (session === null) {
    return (
      <div className="px-4 py-10 text-center text-sm text-ink-500">
        Loading…
      </div>
    );
  }
  if (!session.authenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={withNext("/signup", next)} replace />;
  }
  return <>{children}</>;
}
