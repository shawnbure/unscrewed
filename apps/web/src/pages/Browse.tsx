import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Link, useSearchParams } from "react-router-dom";
import { Container } from "../ui/Container.js";
import { SearchBar } from "../ui/SearchBar.js";
import { ListingCard, type ListingCardData } from "../ui/ListingCard.js";
import { CATEGORIES } from "../ui/CategoryTile.js";
import { api } from "../lib/api.js";

type View = "grid" | "map";

export default function Browse() {
  const [sp, setSp] = useSearchParams();
  const cat = sp.get("cat") ?? "";
  const kind = sp.get("kind") ?? "";
  const q = sp.get("q") ?? "";
  const [view, setView] = useState<View>("grid");
  const [items, setItems] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Build the API query from URL params
  const apiPath = useMemo(() => {
    const u = new URLSearchParams();
    if (cat) u.set("category", cat);
    if (kind) u.set("kind", kind);
    if (q) u.set("q", q);
    u.set("limit", "40");
    return `/listings?${u.toString()}`;
  }, [cat, kind, q]);

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

  return (
    <Container size="xl" className="py-6">
      <div className="mb-4">
        <SearchBar initial={q} />
      </div>

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
                        : "text-ink-700 hover:bg-sand-100"
                    }`}
                  >
                    <span aria-hidden>{c.emoji}</span>
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
            </div>
            <ViewToggle view={view} onChange={setView} />
          </div>

          {view === "grid" ? (
            <GridView items={items} loading={loading} />
          ) : (
            <MapView items={items} />
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
}: {
  items: ListingCardData[];
  loading: boolean;
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
      <div className="card p-10 text-center text-ink-500">
        <div className="text-3xl">🤷</div>
        <p className="mt-2">No trades match your filters yet.</p>
        <Link to="/post" className="btn-primary mt-4 inline-flex">
          Post the first one
        </Link>
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

function MapView({ items }: { items: ListingCardData[] }) {
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
      center: [-98.5, 39.5],
      zoom: 3.5,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => map.remove();
  }, []);

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

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
