import { Link } from "react-router-dom";

interface Props {
  slug: string;
  label: string;
  emoji: string;
  /** Tailwind bg-* color class for the tile background tint */
  tint?: string;
}

export function CategoryTile({ slug, label, emoji, tint = "bg-sand-100" }: Props) {
  return (
    <Link
      to={`/browse?cat=${slug}`}
      className="card group block overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div
        className={`flex h-24 items-center justify-center ${tint} text-4xl`}
        aria-hidden
      >
        <span className="transition-transform group-hover:scale-110">{emoji}</span>
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-semibold text-ink-900">{label}</div>
      </div>
    </Link>
  );
}

export const CATEGORIES: {
  slug: string;
  label: string;
  emoji: string;
  tint: string;
  kind: "good" | "service" | "both";
}[] = [
  { slug: "electronics", label: "Electronics", emoji: "📱", tint: "bg-sky-100", kind: "good" },
  { slug: "tools", label: "Tools", emoji: "🔧", tint: "bg-amber-100", kind: "good" },
  { slug: "vehicles", label: "Vehicles", emoji: "🚗", tint: "bg-rose-100", kind: "good" },
  { slug: "home_garden", label: "Home & Garden", emoji: "🪴", tint: "bg-emerald-100", kind: "good" },
  { slug: "clothing", label: "Clothing", emoji: "👕", tint: "bg-violet-100", kind: "good" },
  { slug: "kids_baby", label: "Kids & Baby", emoji: "🧸", tint: "bg-pink-100", kind: "good" },
  { slug: "sports_outdoors", label: "Sports & Outdoors", emoji: "🏕️", tint: "bg-lime-100", kind: "good" },
  { slug: "music_instruments", label: "Music", emoji: "🎸", tint: "bg-indigo-100", kind: "good" },
  { slug: "books_media", label: "Books & Media", emoji: "📚", tint: "bg-orange-100", kind: "good" },
  { slug: "labor", label: "Day Labor", emoji: "💪", tint: "bg-yellow-100", kind: "service" },
  { slug: "professional_services", label: "Pro Services", emoji: "💼", tint: "bg-slate-100", kind: "service" },
  { slug: "skilled_trades", label: "Skilled Trades", emoji: "🛠️", tint: "bg-stone-100", kind: "service" },
  { slug: "tutoring", label: "Tutoring", emoji: "📖", tint: "bg-teal-100", kind: "service" },
  { slug: "creative", label: "Creative", emoji: "🎨", tint: "bg-fuchsia-100", kind: "service" },
  { slug: "other", label: "Everything Else", emoji: "✨", tint: "bg-sand-200", kind: "both" },
];
