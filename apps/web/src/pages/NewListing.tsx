import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

const CATEGORIES = [
  "electronics",
  "tools",
  "vehicles",
  "home_garden",
  "clothing",
  "kids_baby",
  "sports_outdoors",
  "music_instruments",
  "books_media",
  "labor",
  "professional_services",
  "skilled_trades",
  "tutoring",
  "creative",
  "other",
];

export default function NewListing() {
  const nav = useNavigate();
  const [kind, setKind] = useState<"good" | "service">("good");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [wants, setWants] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function geolocate() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => setError(err.message)
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/listings", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title,
          description,
          category,
          wants,
          postalCode,
          countryCode: "US",
          lat: Number(lat),
          lng: Number(lng),
          photoKeys: [],
        }),
      });
      nav(`/listing/${r.id}`);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Post a trade</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="flex gap-2">
          {(["good", "service"] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 rounded border ${kind === k ? "bg-brand text-white border-brand" : "border-neutral-300"}`}
            >
              {k}
            </button>
          ))}
        </div>
        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        <textarea
          required
          rows={5}
          placeholder="Describe what you're offering"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          required
          placeholder="What do you want in trade?"
          value={wants}
          onChange={(e) => setWants(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            required
            placeholder="ZIP"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
          <input
            required
            placeholder="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
          <input
            required
            placeholder="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={geolocate}
          className="text-sm text-brand underline"
        >
          Use my current location
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-brand text-white py-2.5 disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post trade"}
        </button>
      </form>
    </div>
  );
}
