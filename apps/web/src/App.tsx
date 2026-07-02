import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Plus,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
  Inbox as InboxIcon,
  User as UserIcon,
} from "lucide-react";
import { useSession } from "./lib/session.js";
import { api } from "./lib/api.js";
import { Container } from "./ui/Container.js";
import { Logo } from "./ui/Logo.js";
import { PhilosophyModal } from "./ui/PhilosophyModal.js";

export default function App() {
  const { session, refresh } = useSession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [philOpen, setPhilOpen] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function signOut() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* drop local state regardless */
    }
    await refresh();
    setMobileOpen(false);
    navigate("/");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-surface-200/70 bg-surface-50/85 backdrop-blur">
        <Container size="xl">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link to="/" className="shrink-0">
              <Logo className="h-7 w-auto" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 text-sm md:flex">
              <NavLink
                to="/browse"
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 ${isActive ? "bg-surface-100 text-ink-900" : "text-ink-700 hover:bg-surface-100"}`
                }
              >
                Browse
              </NavLink>
              {session?.authenticated && (
                <NavLink
                  to="/trades"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 ${isActive ? "bg-surface-100 text-ink-900" : "text-ink-700 hover:bg-surface-100"}`
                  }
                >
                  <InboxIcon className="h-4 w-4" strokeWidth={2} /> My trades
                </NavLink>
              )}
              {session?.authenticated && session.isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 ${isActive ? "bg-amber-100 text-amber-800" : "text-amber-700 hover:bg-amber-50"}`
                  }
                  title="Admin tools"
                >
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} /> Admin
                </NavLink>
              )}
              {session?.authenticated ? (
                <>
                  <NavLink to="/post" className="btn-brand ml-2">
                    <Plus className="h-4 w-4" strokeWidth={2.5} /> Post a trade
                  </NavLink>
                  <NavLink
                    to="/account"
                    className={({ isActive }) =>
                      `rounded-xl p-2 ${isActive ? "bg-surface-100 text-ink-900" : "text-ink-700 hover:bg-surface-100"}`
                    }
                    title="Account"
                    aria-label="Account"
                  >
                    <UserIcon className="h-4 w-4" strokeWidth={2} />
                  </NavLink>
                  <button
                    type="button"
                    onClick={signOut}
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

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-xl p-2 text-ink-700 hover:bg-surface-100 md:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Mobile sheet */}
          {mobileOpen && (
            <div className="border-t border-surface-200 py-3 md:hidden">
              <div className="flex flex-col gap-1">
                <MobileLink to="/browse" onClick={() => setMobileOpen(false)}>
                  Browse
                </MobileLink>
                {session?.authenticated && (
                  <MobileLink to="/post" onClick={() => setMobileOpen(false)}>
                    <Plus className="h-4 w-4" strokeWidth={2.5} /> Post a trade
                  </MobileLink>
                )}
                {session?.authenticated && (
                  <MobileLink to="/trades" onClick={() => setMobileOpen(false)}>
                    <InboxIcon className="h-4 w-4" strokeWidth={2} /> My trades
                  </MobileLink>
                )}
                {session?.authenticated && (
                  <MobileLink to="/account" onClick={() => setMobileOpen(false)}>
                    <UserIcon className="h-4 w-4" strokeWidth={2} /> Account
                  </MobileLink>
                )}
                {session?.authenticated && session.isAdmin && (
                  <MobileLink to="/admin" onClick={() => setMobileOpen(false)}>
                    <ShieldCheck className="h-4 w-4" strokeWidth={2} /> Admin
                  </MobileLink>
                )}
                {session?.authenticated ? (
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-surface-100"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                ) : (
                  <>
                    <MobileLink to="/login" onClick={() => setMobileOpen(false)}>
                      <LogIn className="h-4 w-4" /> Sign in
                    </MobileLink>
                    <MobileLink to="/signup" onClick={() => setMobileOpen(false)}>
                      <UserPlus className="h-4 w-4" /> Sign up
                    </MobileLink>
                  </>
                )}
              </div>
            </div>
          )}
        </Container>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-surface-200 bg-white py-10 text-sm text-ink-500">
        <Container size="xl" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-auto" />
            <span className="hidden text-xs text-ink-400 sm:inline">
              Trade what you have for what you need.
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <button
              type="button"
              onClick={() => setPhilOpen(true)}
              className="hover:text-ink-900"
            >
              Our philosophy
            </button>
            <Link to="/tos" className="hover:text-ink-900">Terms</Link>
            <a href="mailto:help@unscrewed.lol" className="hover:text-ink-900">
              Contact
            </a>
            <span className="text-ink-300">© {new Date().getFullYear()}</span>
          </div>
        </Container>
      </footer>
      <PhilosophyModal open={philOpen} onClose={() => setPhilOpen(false)} />
    </div>
  );
}

function MobileLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${isActive ? "bg-surface-100 font-semibold text-ink-900" : "text-ink-700 hover:bg-surface-100"}`
      }
    >
      {children}
    </NavLink>
  );
}
