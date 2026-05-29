import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  initial?: string;
  size?: "lg" | "md";
}

export function SearchBar({ initial = "", size = "md" }: Props) {
  const [q, setQ] = useState(initial);
  const nav = useNavigate();
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    nav(`/browse?${params.toString()}`);
  };
  const heightClass = size === "lg" ? "py-4 text-lg" : "py-2.5 text-base";
  return (
    <form
      onSubmit={onSubmit}
      className={`flex w-full items-center gap-2 rounded-2xl bg-white shadow-card ring-1 ring-sand-200 transition-shadow focus-within:ring-brand-300 ${size === "lg" ? "p-2 pl-4" : "p-1.5 pl-3"}`}
      role="search"
    >
      <span aria-hidden className="text-ink-400">
        🔎
      </span>
      <input
        type="search"
        placeholder="Search trades — guitar, lawn care, baby clothes…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={`flex-1 bg-transparent text-ink-900 placeholder:text-ink-400 focus:outline-none ${heightClass}`}
      />
      <button
        type="submit"
        className={`btn-primary ${size === "lg" ? "px-6 py-3" : "py-2"}`}
      >
        Search
      </button>
    </form>
  );
}
