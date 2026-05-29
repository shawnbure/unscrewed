import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSession } from "./lib/session.js";
import { api } from "./lib/api.js";
import { Container } from "./ui/Container.js";

export default function App() {
  const { session, refresh } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-sand-200/70 bg-sand-50/80 backdrop-blur">
        <Container size="xl">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-white shadow-sm">
                u
              </span>
              <span className="text-ink-900">
                unscrewed<span className="text-ink-400">.lol</span>
              </span>
            </Link>

            <nav className="flex items-center gap-1 text-sm">
              <NavLink
                to="/browse"
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 ${isActive ? "bg-sand-100 text-ink-900" : "text-ink-700 hover:bg-sand-100"}`
                }
              >
                Browse
              </NavLink>
              {session?.authenticated ? (
                <>
                  <NavLink to="/post" className="btn-primary ml-2">
                    <span aria-hidden>+</span> Post a trade
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
                    className="btn-ghost"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="btn-ghost">
                    Sign in
                  </NavLink>
                  <NavLink to="/signup" className="btn-primary ml-1">
                    Sign up
                  </NavLink>
                </>
              )}
            </nav>
          </div>
        </Container>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-sand-200 bg-white py-8 text-xs text-ink-500">
        <Container size="xl" className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <span>© unscrewed.lol — trade what you have for what you need.</span>
          <div className="flex items-center gap-4">
            <Link to="/tos" className="hover:text-brand-700">
              Terms
            </Link>
            <a
              href="mailto:help@unscrewed.lol"
              className="hover:text-brand-700"
            >
              Contact
            </a>
          </div>
        </Container>
      </footer>
    </div>
  );
}
