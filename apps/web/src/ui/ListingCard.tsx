import { Link } from "react-router-dom";
import { CATEGORIES } from "./CategoryTile.js";
import { photoUrl } from "../lib/photoUrl.js";

export interface ListingCardData {
  id: string;
  title: string;
  description: string;
  wants: string;
  kind: "good" | "service";
  category: string;
  lat: number;
  lng: number;
  postal_code?: string;
  postalCode?: string;
  // From a future API enhancement; for now we fall back to a category emoji
  photo_keys?: string[];
  firstPhotoKey?: string;
}

export function ListingCard({ l }: { l: ListingCardData }) {
  const cat = CATEGORIES.find((c) => c.slug === l.category);
  const photo = l.firstPhotoKey ?? l.photo_keys?.[0];
  return (
    <Link
      to={`/listing/${l.id}`}
      className="card group block overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden ${cat?.tint ?? "bg-sand-100"}`}
      >
        {photo ? (
          <img
            src={photoUrl(photo)}
            alt={l.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl" aria-hidden>
            {cat?.emoji ?? "✨"}
          </div>
        )}
        <span className="absolute left-2 top-2 chip-brand backdrop-blur-sm">
          {l.kind === "service" ? "service" : "good"}
        </span>
      </div>
      <div className="space-y-1.5 p-3.5">
        <div className="line-clamp-1 font-semibold text-ink-900">{l.title}</div>
        <div className="line-clamp-2 text-sm text-ink-500">{l.description}</div>
        <div className="flex items-center justify-between pt-1">
          <span className="chip" title="What this lister wants in trade">
            <span aria-hidden>🔁</span>
            <span className="line-clamp-1 max-w-[10rem]">{l.wants}</span>
          </span>
          {(l.postalCode || l.postal_code) && (
            <span className="text-xs text-ink-400">
              {l.postalCode ?? l.postal_code}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
