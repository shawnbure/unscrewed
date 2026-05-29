import { Link } from "react-router-dom";
import { CategoryIcon } from "./CategoryIcons.js";

interface Props {
  slug: string;
  label: string;
  tint?: string; // bg tone class for the icon badge
  iconColor?: string; // text-* class for the icon color
}

export function CategoryTile({
  slug,
  label,
  tint = "bg-surface-100",
  iconColor = "text-ink-700",
}: Props) {
  return (
    <Link
      to={`/browse?cat=${slug}`}
      className="card group flex items-center gap-3 p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-pop hover:ring-brand-200"
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tint} ${iconColor} transition-transform group-hover:scale-105`}
      >
        <CategoryIcon slug={slug} className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold text-ink-900">{label}</span>
    </Link>
  );
}

// Single source of truth for category taxonomy + presentation.
// `kind` decides which grid the tile appears in on the homepage.
export const CATEGORIES: {
  slug: string;
  label: string;
  tint: string;
  iconColor: string;
  kind: "good" | "service" | "both";
}[] = [
  { slug: "electronics", label: "Electronics", tint: "bg-accent-sky", iconColor: "text-sky-700", kind: "good" },
  { slug: "tools", label: "Tools", tint: "bg-accent-peach", iconColor: "text-orange-700", kind: "good" },
  { slug: "vehicles", label: "Vehicles", tint: "bg-accent-blush", iconColor: "text-rose-700", kind: "good" },
  { slug: "home_garden", label: "Home & Garden", tint: "bg-accent-mint", iconColor: "text-emerald-700", kind: "good" },
  { slug: "clothing", label: "Clothing", tint: "bg-accent-lilac", iconColor: "text-violet-700", kind: "good" },
  { slug: "kids_baby", label: "Kids & Baby", tint: "bg-accent-blush", iconColor: "text-pink-700", kind: "good" },
  { slug: "sports_outdoors", label: "Sports & Outdoors", tint: "bg-accent-mint", iconColor: "text-lime-700", kind: "good" },
  { slug: "music_instruments", label: "Music", tint: "bg-accent-lilac", iconColor: "text-indigo-700", kind: "good" },
  { slug: "books_media", label: "Books & Media", tint: "bg-accent-peach", iconColor: "text-amber-700", kind: "good" },
  { slug: "labor", label: "Day Labor", tint: "bg-accent-lemon", iconColor: "text-yellow-800", kind: "service" },
  { slug: "professional_services", label: "Pro Services", tint: "bg-surface-100", iconColor: "text-ink-800", kind: "service" },
  { slug: "skilled_trades", label: "Skilled Trades", tint: "bg-accent-peach", iconColor: "text-stone-700", kind: "service" },
  { slug: "tutoring", label: "Tutoring", tint: "bg-accent-mint", iconColor: "text-teal-700", kind: "service" },
  { slug: "creative", label: "Creative", tint: "bg-accent-lilac", iconColor: "text-fuchsia-700", kind: "service" },
  { slug: "other", label: "Everything Else", tint: "bg-surface-200", iconColor: "text-ink-700", kind: "both" },
];
