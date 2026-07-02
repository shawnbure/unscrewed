// /community — public page. Big members number, US bubble map of
// aggregated zip3 clusters, and a call-to-join button.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import maplibregl from "maplibre-gl";
import { ArrowRight, Users, MapPin, Handshake } from "lucide-react";
import { Container } from "../ui/Container.js";
import { getStats, type StatsPayload } from "../lib/stats.js";
import { useSession } from "../lib/session.js";

export default function CommunityPage() {
  const { session } = useSession();
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  // Init map once
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
      zoom: 3.2,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    mapRef.current = map;
    return () => map.remove();
  }, []);

  // Render clusters when stats arrive / change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stats) return;
    markersRef.current.forEach((m) => m.remove());

    const clusters = stats.map_clusters;
    if (clusters.length === 0) {
      markersRef.current = [];
      return;
    }
    const maxCount = Math.max(...clusters.map((c) => c.count));

    markersRef.current = clusters.map((c) => {
      const el = document.createElement("div");
      const scale = 0.4 + 0.6 * (c.count / maxCount); // 0.4–1.0
      const size = Math.round(28 + 22 * scale);
      el.style.cssText = `
        display:flex; align-items:center; justify-content:center;
        width:${size}px; height:${size}px; border-radius:9999px;
        background: rgba(31,146,85,0.85);
        color: white; font-weight: 700; font-size: 12px;
        border: 3px solid rgba(255,255,255,0.9);
        box-shadow: 0 4px 14px rgba(14,17,22,0.20);
        cursor: pointer;`;
      el.textContent = String(c.count);
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([c.lng, c.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(
            `<div style="font-weight:600;color:#106437">ZIP ${c.zip3}xx</div>
             <div style="font-size:12px;color:#5b6470">${c.count} neighbor${c.count === 1 ? "" : "s"}</div>`
          )
        )
        .addTo(map);
      return m;
    });

    // Fit to bounds so the picture "just works" even with sparse data.
    if (clusters.length > 0) {
      const b = new maplibregl.LngLatBounds();
      clusters.forEach((c) => b.extend([c.lng, c.lat]));
      map.fitBounds(b, {
        padding: 60,
        maxZoom: 6,
        duration: 300,
      });
    }
  }, [stats]);

  const totalMapped = stats?.map_clusters.reduce((sum, c) => sum + c.count, 0) ?? 0;
  const totalMembers = stats?.members_total ?? 0;

  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-surface-200">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-surface-50 to-surface-50" />
        <Container size="xl" className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              The community, so far
            </p>
            <h1 className="display mt-2 text-balance text-5xl leading-[1.02] text-ink-900 sm:text-6xl">
              <span className="text-brand-600">
                {totalMembers.toLocaleString()}
              </span>{" "}
              neighbors trading with each other.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-ink-500 sm:text-lg">
              Every dot on the map is a real person nearby. No fees, no
              middleman — just neighbors deciding to help each other out.
            </p>
            {!session?.authenticated && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/signup" className="btn-brand text-base">
                  Join the community
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/browse" className="btn-outline text-base">
                  See what people are trading
                </Link>
              </div>
            )}
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={<Users className="h-5 w-5" strokeWidth={2} />}
              label="Members"
              value={totalMembers.toLocaleString()}
            />
            <SummaryCard
              icon={<Handshake className="h-5 w-5" strokeWidth={2} />}
              label="Active listings"
              value={(stats?.listings_active ?? 0).toLocaleString()}
            />
            <SummaryCard
              icon={<MapPin className="h-5 w-5" strokeWidth={2} />}
              label="Posted this month"
              value={(stats?.listings_this_month ?? 0).toLocaleString()}
            />
          </div>
        </Container>
      </section>

      {/* Map */}
      <Container size="xl" className="mt-12">
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
              Where we are
            </p>
            <h2 className="display mt-1 text-2xl text-ink-900 sm:text-3xl">
              The map of trades that could happen.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-500">
              Each dot is a ZIP-3 area (~500,000 people) that has at least one
              unscrewed member. The bigger the dot, the more neighbors. Nobody's
              exact ZIP is ever shown.
            </p>
          </div>
        </header>
        <div
          ref={mapEl}
          className="h-[60vh] w-full overflow-hidden rounded-2xl shadow-card ring-1 ring-surface-200"
          aria-label="Community map"
        />
        {stats && stats.map_clusters.length === 0 && (
          <p className="mt-3 text-center text-sm text-ink-500">
            Nobody's on the map yet — be the first to plant a flag.
          </p>
        )}
        {stats && stats.map_clusters.length > 0 && (
          <p className="mt-3 text-center text-xs text-ink-400">
            {totalMapped.toLocaleString()} of {totalMembers.toLocaleString()}{" "}
            member{totalMembers === 1 ? "" : "s"} shown — the rest haven't
            added a ZIP yet.
          </p>
        )}
      </Container>

      {/* Bottom CTA */}
      <Container size="lg" className="mt-16">
        <div className="rounded-3xl bg-ink-900 p-8 text-center text-white sm:p-12">
          <h2 className="display text-3xl text-balance sm:text-4xl">
            Add one dot to the map.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
            Every new neighbor makes the network more useful for the neighbors
            already here. It's how this thing works.
          </p>
          {!session?.authenticated ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/signup"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-surface-100"
              >
                Create an account
              </Link>
              <Link
                to="/browse"
                className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Just look around
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/post"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-surface-100"
              >
                Post a trade
              </Link>
              <Link
                to="/account"
                className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Update my ZIP
              </Link>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-brand-700">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="mt-2 text-3xl font-bold text-ink-900">{value}</div>
    </div>
  );
}
