import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, PackageOpen } from "lucide-react";
import { Container } from "../ui/Container.js";
import { SearchBar } from "../ui/SearchBar.js";
import { ListingCard, type ListingCardData } from "../ui/ListingCard.js";
import { CATEGORIES } from "../ui/CategoryTile.js";
import { CategoryIcon } from "../ui/CategoryIcons.js";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";
import { withNext } from "../lib/navigation.js";
import {
  listingStarterPath,
  type ListingStarterId,
} from "../lib/listingStarters.js";

type View = "grid" | "map";
interface BrowseLocation {
  lat: number;
  lng: number;
  radiusKm: number;
  place: string;
}

export default function Browse() {
  const [sp, setSp] = useSearchParams();
  const { session } = useSession();
  const cat = sp.get("cat") ?? "";
  const kind = sp.get("kind") ?? "";
  const q = sp.get("q") ?? "";
  const location = useMemo(() => readLocation(sp), [sp]);
  const [view, setView] = useState<View>("grid");
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Build the API query from URL params
  const apiPath = useMemo(() => {
    const u = new URLSearchParams();
    if (cat) u.set("category", cat);
    if (kind) u.set("kind", kind);
    if (q) u.set("q", q);
    if (location) {
      u.set("lat", String(location.lat));
      u.set("lng", String(location.lng));
      u.set("radiusKm", String(location.radiusKm));
    }
    u.set("limit", "40");
    return `/listings?${u.toString()}`;
  }, [cat, kind, q, location]);

  useEffect(() => {
    setLoading(true);
    api<{ items: ListingCardData[] }>(apiPath)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [apiPath]);

  const setParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(sp);
    if (val) next.set(key, val);
    else next.delete(key);
    setSp(next);
  };
  const clearLocation = () => {
    const next = new URLSearchParams(sp);
    for (const key of ["lat", "lng", "radiusKm", "place"]) next.delete(key);
    setSp(next);
  };
  const postPath = session?.authenticated
    ? "/post"
    : withNext("/signup", "/post");
  const starterPath = (id: ListingStarterId) => {
    const path = listingStarterPath(id);
    return session?.authenticated ? path : withNext("/signup", path);
  };

  return (
    <Container size="xl" className="py-6">
      <div className="mb-4">
        <SearchBar initial={q} />
      </div>

      {location && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-brand-900">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              Showing trades around <strong>{location.place}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={clearLocation}
            className="font-medium text-brand-700 hover:underline"
          >
            Browse all locations
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filter rail */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <FilterGroup title="What kind?">
            <FilterChip
              active={!kind}
              onClick={() => setParam("kind", null)}
              label="All"
            />
            <FilterChip
              active={kind === "good"}
              onClick={() => setParam("kind", "good")}
              label="Goods"
            />
            <FilterChip
              active={kind === "service"}
              onClick={() => setParam("kind", "service")}
              label="Services"
            />
          </FilterGroup>

          <FilterGroup title="Categories">
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setParam("cat", null)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    !cat
                      ? "bg-brand-50 font-semibold text-brand-700"
                      : "text-ink-700 hover:bg-sand-100"
                  }`}
                >
                  <span>All categories</span>
                </button>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() =>
                      setParam("cat", c.slug === cat ? null : c.slug)
                    }
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                      cat === c.slug
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-ink-700 hover:bg-surface-100"
                    }`}
                  >
                    <CategoryIcon slug={c.slug} className="h-4 w-4" />
                    <span>{c.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </FilterGroup>
        </aside>

        {/* Results */}
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-ink-500">
              {loading ? "Loading…" : `${items.length} trade${items.length === 1 ? "" : "s"}`}
              {cat ? ` · ${CATEGORIES.find((c) => c.slug === cat)?.label}` : ""}
              {kind ? ` · ${kind}` : ""}
              {q ? ` · "${q}"` : ""}
              {location ? ` · ${location.place}` : ""}
            </div>
            <ViewToggle view={view} onChange={setView} />
          </div>

          {view === "grid" ? (
            <GridView
              items={items}
              loading={loading}
              location={location}
              postPath={postPath}
              itemStarterPath={starterPath("useful_item")}
              helpStarterPath={starterPath("one_hour_help")}
            />
          ) : (
            <MapView items={items} location={location} />
          )}
        </div>
      </div>
    </Container>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-brand-500 text-white"
          : "bg-sand-100 text-ink-700 hover:bg-sand-200"
      }`}
    >
      {label}
    </button>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-sand-100 p-1 text-sm">
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`rounded-lg px-3 py-1.5 font-medium ${
          view === "grid" ? "bg-white shadow-sm text-ink-900" : "text-ink-500"
        }`}
      >
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange("map")}
        className={`rounded-lg px-3 py-1.5 font-medium ${
          view === "map" ? "bg-white shadow-sm text-ink-900" : "text-ink-500"
        }`}
      >
        Map
      </button>
    </div>
  );
}

function GridView({
  items,
  loading,
  location,
  postPath,
  itemStarterPath,
  helpStarterPath,
}: {
  items: ListingCardData[];
  loading: boolean;
  location: BrowseLocation | null;
  postPath: string;
  itemStarterPath: string;
  helpStarterPath: string;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-72 animate-pulse bg-sand-100" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center p-10 text-center text-ink-500">
        <PackageOpen className="h-10 w-10 text-ink-300" strokeWidth={1.5} />
        <p className="mt-3">
          {location
            ? `No real trades are posted around ${location.place} yet.`
            : "No trades match your filters yet."}
        </p>
        {location && (
          <p className="mt-1 max-w-md text-sm text-ink-400">
            This local pool becomes useful when nearby people add things or
            skills they would genuinely trade.
          </p>
        )}
        {location ? (
          <>
            <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-brand-700">
              Start with something real
            </p>
            <div className="mt-3 grid w-full max-w-xl gap-3 text-left sm:grid-cols-2">
              <ListingStarterLink
                to={itemStarterPath}
                title="A useful item"
                body="Add the exact item, condition, pickup timing, and what you would accept."
              />
              <ListingStarterLink
                to={helpStarterPath}
                title="One hour of practical help"
                body="Define one task, your availability, limits, and realistic returns."
              />
            </div>
            <Link
              to={postPath}
              className="mt-3 text-sm font-medium text-brand-700 hover:underline"
            >
              Or start with a blank listing
            </Link>
            <p className="mt-3 max-w-lg text-xs leading-relaxed text-ink-400">
              Starters select editable fields only. Nothing is posted until a
              real person adds accurate details and submits it.
            </p>
          </>
        ) : (
          <Link to={postPath} className="btn-brand mt-4 inline-flex">
            Post the first one
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((l) => (
        <ListingCard key={l.id} l={l} />
      ))}
    </div>
  );
}

function ListingStarterLink({
  to,
  title,
  body,
}: {
  to: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-brand-200 bg-brand-50 p-4 transition-colors hover:border-brand-400 hover:bg-brand-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300/30"
    >
      <span className="block font-semibold text-brand-900">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-brand-800/75">
        {body}
      </span>
      <span className="mt-3 block text-xs font-semibold text-brand-700">
        Use this editable starter →
      </span>
    </Link>
  );
}

function MapView({
  items,
  location,
}: {
  items: ListingCardData[];
  location: BrowseLocation | null;
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapEl.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: location ? [location.lng, location.lat] : [-98.5, 39.5],
      zoom: location ? 10 : 3.5,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => map.remove();
  }, [location]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    if (items.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    markersRef.current = items.map((l) => {
      bounds.extend([l.lng, l.lat]);
      return new maplibregl.Marker({ color: "#1f9d57" })
        .setLngLat([l.lng, l.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setHTML(
            `<a href="/listing/${l.id}" style="font-weight:600;color:#106437">${escapeHtml(l.title)}</a><br/><span style="font-size:12px;color:#5b6470">wants: ${escapeHtml(l.wants).slice(0, 80)}</span>`
          )
        )
        .addTo(map);
    });
    if (!bounds.isEmpty())
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 400 });
  }, [items]);

  return (
    <div
      ref={mapEl}
      className="h-[70vh] w-full overflow-hidden rounded-2xl shadow-card"
    />
  );
}

function readLocation(params: URLSearchParams): BrowseLocation | null {
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radiusKm = Number(params.get("radiusKm"));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(radiusKm) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    radiusKm < 1 ||
    radiusKm > 500
  ) {
    return null;
  }
  const rawPlace = params.get("place")?.trim();
  return {
    lat,
    lng,
    radiusKm,
    place: rawPlace?.slice(0, 80) || "this area",
  };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
