// USA address autocomplete via /geocode/search (Worker → Nominatim).
// One visible field. Hidden state: zip + lat/lng pulled from the picked row.

import { useEffect, useRef, useState } from "react";
import { MapPin, Crosshair, Loader2 } from "lucide-react";
import { api } from "../lib/api.js";

export interface AddressValue {
  display: string;
  postcode: string;
  lat: number;
  lng: number;
}

interface Suggestion {
  id: string;
  display: string;
  lat: number;
  lng: number;
  postcode: string | null;
  city: string | null;
  state: string | null;
  type: string | null;
}

interface Props {
  value: AddressValue | null;
  onChange: (v: AddressValue | null) => void;
}

const MIN_QUERY = 3;

export function AddressPicker({ value, onChange }: Props) {
  const [q, setQ] = useState(value?.display ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // The listing form may fill a member's account ZIP after this component
  // mounts. Reflect that private default without disturbing manual typing.
  useEffect(() => {
    if (value?.display) setQ(value.display);
  }, [value?.display]);

  // Close dropdown on outside-click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY) {
      setItems([]);
      return;
    }
    // If the query exactly matches the picked value, don't search again.
    if (value && trimmed === value.display) return;
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await api<{ items: Suggestion[] }>(
          `/geocode/search?q=${encodeURIComponent(trimmed)}`
        );
        setItems(r.items);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pick(s: Suggestion) {
    const picked: AddressValue = {
      display: s.display,
      postcode: s.postcode ?? "",
      lat: s.lat,
      lng: s.lng,
    };
    onChange(picked);
    setQ(s.display);
    setOpen(false);
  }

  function clear() {
    setQ("");
    setItems([]);
    onChange(null);
  }

  async function useMyLocation() {
    if (!navigator.geolocation) return;
    setBusy(true);
    setReverseError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Reverse via Nominatim through our proxy is not implemented; instead
          // do a forward search for the coords and take the first hit.
          const r = await api<{ items: Suggestion[] }>(
            `/geocode/search?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`
          );
          if (r.items[0]) {
            pick(r.items[0]);
          } else {
            // Fall back: store the raw coords with no display nicety.
            const v: AddressValue = {
              display: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
              postcode: "",
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            onChange(v);
            setQ(v.display);
          }
        } catch (e: any) {
          setReverseError(e?.message ?? "Geolocation lookup failed");
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setReverseError(err.message);
        setBusy(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-surface-300 bg-white px-3 py-2 focus-within:border-ink-900 focus-within:ring-4 focus-within:ring-ink-900/10">
        <MapPin className="h-4 w-4 shrink-0 text-ink-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onChange(null);
          }}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder="Start typing an address, ZIP, or city…"
          className="flex-1 bg-transparent text-ink-900 placeholder:text-ink-400 focus:outline-none"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
        )}
        {value && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-ink-400 hover:text-ink-700"
            aria-label="Clear address"
          >
            Clear
          </button>
        )}
      </div>

      {open && items.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-surface-200 bg-white shadow-pop">
          {items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-100"
              >
                <div className="line-clamp-1 font-medium text-ink-900">
                  {s.display}
                </div>
                <div className="mt-0.5 text-xs text-ink-500">
                  {[s.city, s.state, s.postcode].filter(Boolean).join(" · ")}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy}
          className="btn-ghost text-xs"
        >
          <Crosshair className="h-3.5 w-3.5" strokeWidth={2} />
          {busy ? "Locating…" : "Use my current location"}
        </button>
        <p className="text-xs text-ink-400">
          USA addresses only for now. Powered by{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-ink-700"
          >
            OpenStreetMap
          </a>
          .
        </p>
      </div>
      {reverseError && (
        <p className="mt-1 text-xs text-red-600">{reverseError}</p>
      )}
      {value && value.postcode === "" && (
        <p className="mt-1 text-xs text-amber-700">
          We couldn't read a ZIP from that pick. We'll still save the location,
          but a postal code is recommended.
        </p>
      )}
    </div>
  );
}
