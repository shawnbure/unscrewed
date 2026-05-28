import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

interface ListingRow {
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
}

export default function Browse() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [items, setItems] = useState<ListingRow[]>([]);

  useEffect(() => {
    if (!mapEl.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      // Free OSM raster tiles — swap to Protomaps PMTiles served from R2 later.
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
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

    const reload = async () => {
      const b = map.getBounds();
      const url = new URL("/listings", "http://x");
      url.searchParams.set("north", String(b.getNorth()));
      url.searchParams.set("south", String(b.getSouth()));
      url.searchParams.set("east", String(b.getEast()));
      url.searchParams.set("west", String(b.getWest()));
      url.searchParams.set("limit", "50");
      try {
        const r = await api<{ items: ListingRow[] }>(
          url.pathname + url.search
        );
        setItems(r.items);
      } catch (e) {
        console.error(e);
      }
    };
    map.on("moveend", reload);
    map.on("load", reload);
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = items.map((l) =>
      new maplibregl.Marker({ color: "#1f7a4d" })
        .setLngLat([l.lng, l.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 16 }).setHTML(
            `<a href="/listing/${l.id}" style="font-weight:600;color:#155534">${escapeHtml(l.title)}</a><br/><span style="font-size:12px;color:#666">wants: ${escapeHtml(l.wants).slice(0, 80)}</span>`
          )
        )
        .addTo(map)
    );
  }, [items]);

  return (
    <div className="h-[calc(100vh-3.5rem-3rem)] grid grid-cols-1 md:grid-cols-[400px_1fr]">
      <aside className="overflow-y-auto border-r bg-white">
        <div className="px-4 py-3 border-b sticky top-0 bg-white z-10">
          <h2 className="font-semibold">Trades in view ({items.length})</h2>
        </div>
        <ul>
          {items.map((l) => (
            <li key={l.id} className="border-b">
              <Link
                to={`/listing/${l.id}`}
                className="block px-4 py-3 hover:bg-neutral-50"
              >
                <div className="font-medium text-brand-dark">{l.title}</div>
                <div className="text-xs text-neutral-500">
                  {l.kind} · {l.category}
                </div>
                <div className="text-sm mt-1 line-clamp-2">{l.description}</div>
                <div className="text-xs text-neutral-500 mt-1">
                  Wants: {l.wants}
                </div>
              </Link>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-4 py-8 text-sm text-neutral-500">
              No trades in this area yet. Be the first —{" "}
              <Link to="/post" className="text-brand underline">
                post one
              </Link>
              .
            </li>
          )}
        </ul>
      </aside>
      <div ref={mapEl} className="w-full h-full" />
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
