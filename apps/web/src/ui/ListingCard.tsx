import { Link } from "react-router-dom";
import { ArrowRightLeft, MapPin } from "lucide-react";
import { CATEGORIES } from "./CategoryTile.js";
import { CategoryIcon } from "./CategoryIcons.js";
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
  photo_keys?: string[];
  firstPhotoKey?: string;
}

export function ListingCard({ l }: { l: ListingCardData }) {
  const cat = CATEGORIES.find((c) => c.slug === l.category);
  const photo = l.firstPhotoKey ?? l.photo_keys?.[0];
  return (
    <Link
      to={`/listing/${l.id}`}
      className="card group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-100">
        {photo ? (
          <img
            src={photoUrl(photo)}
            alt={l.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className={`flex h-full items-center justify-center ${cat?.tint ?? "bg-surface-100"} ${cat?.iconColor ?? "text-ink-400"}`}>
            <CategoryIcon slug={l.category} className="h-12 w-12" />
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-700 backdrop-blur">
          {l.kind}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="line-clamp-1 font-semibold text-ink-900">
          {l.title}
        </div>
        <div className="line-clamp-2 text-sm text-ink-500">
          {l.description}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
            <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="line-clamp-1 max-w-[10rem]">{l.wants}</span>
          </span>
          {(l.postalCode || l.postal_code) && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-400">
              <MapPin className="h-3 w-3" strokeWidth={2} />
              {l.postalCode ?? l.postal_code}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
