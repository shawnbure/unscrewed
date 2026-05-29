import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../lib/session.js";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, refresh } = useSession();
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
  if (!session.authenticated) return <Navigate to="/login" replace />;
  if (!session.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
