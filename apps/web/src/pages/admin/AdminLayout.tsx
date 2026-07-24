import { NavLink, Outlet } from "react-router-dom";
import { Container } from "../../ui/Container.js";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/listings", label: "Listings" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/support", label: "Support" },
];

export function AdminLayout() {
  return (
    <Container size="xl" className="py-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <aside className="space-y-1 md:sticky md:top-20 md:self-start">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            Admin
          </p>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2 text-sm ${
                  isActive
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-ink-700 hover:bg-sand-100"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
