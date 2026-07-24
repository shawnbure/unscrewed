import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

interface Props {
  initial?: string;
  size?: "lg" | "md";
}

export function SearchBar({ initial = "", size = "md" }: Props) {
  const [q, setQ] = useState(initial);
  const nav = useNavigate();
  const location = useLocation();
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Searches made from Browse keep the active location and category
    // context. Searches from other pages begin a fresh browse.
    const params =
      location.pathname === "/browse"
        ? new URLSearchParams(location.search)
        : new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    nav(`/browse?${params.toString()}`);
  };
  const isLg = size === "lg";
  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`flex w-full items-center gap-2 rounded-2xl bg-white shadow-card ring-1 ring-surface-200 transition-shadow focus-within:ring-2 focus-within:ring-ink-900/30 ${isLg ? "p-2 pl-4" : "p-1.5 pl-3"}`}
    >
      <Search
        className="h-4 w-4 shrink-0 text-ink-400"
        strokeWidth={2}
        aria-hidden
      />
      <input
        type="search"
        placeholder="Search trades — guitar, lawn care, baby clothes…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={`flex-1 bg-transparent text-ink-900 placeholder:text-ink-400 focus:outline-none ${isLg ? "py-3 text-base" : "py-2 text-sm"}`}
      />
      <button
        type="submit"
        className={`btn-primary ${isLg ? "px-5 py-2.5" : "py-1.5"}`}
      >
        Search
      </button>
    </form>
  );
}
