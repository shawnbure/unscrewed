import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSession } from "./lib/session.js";
import { api } from "./lib/api.js";

export default function App() {
  const { session, refresh } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-brand text-lg">
            unscrewed<span className="text-neutral-400">.lol</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/browse" className="hover:text-brand">
              Browse
            </NavLink>
            {session?.authenticated ? (
              <>
                <NavLink
                  to="/post"
                  className="rounded bg-brand text-white px-3 py-1.5 hover:bg-brand-dark"
                >
                  Post a trade
                </NavLink>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api("/auth/logout", { method: "POST" });
                    } catch {
                      /* even if the network call fails, drop local state */
                    }
                    await refresh();
                    navigate("/");
                  }}
                  className="text-neutral-500 hover:text-neutral-900"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="hover:text-brand">
                  Sign in
                </NavLink>
                <NavLink
                  to="/signup"
                  className="rounded bg-brand text-white px-3 py-1.5 hover:bg-brand-dark"
                >
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t bg-white py-6 text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto px-4 flex justify-between">
          <span>© unscrewed.lol</span>
          <span>
            <Link to="/tos" className="hover:text-brand">
              Terms
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
