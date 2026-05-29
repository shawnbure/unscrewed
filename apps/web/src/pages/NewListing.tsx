import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container } from "../ui/Container.js";
import { CATEGORIES } from "../ui/CategoryTile.js";
import { PhotoUploader } from "../ui/PhotoUploader.js";
import { api } from "../lib/api.js";

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "na", label: "Not applicable" },
];

export default function NewListing() {
  const nav = useNavigate();
  const [kind, setKind] = useState<"good" | "service">("good");
  const [category, setCategory] = useState("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("good");
  const [wants, setWants] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function geolocate() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser");
      return;
    }
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
          condition: kind === "good" ? condition : undefined,
          wants,
          postalCode,
          countryCode: "US",
          lat: Number(lat),
          lng: Number(lng),
          photoKeys,
        }),
      });
      nav(`/listing/${r.id}`);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  const categories =
    kind === "good"
      ? CATEGORIES.filter((c) => c.kind !== "service")
      : CATEGORIES.filter((c) => c.kind !== "good");

  return (
    <Container size="md" className="py-8">
      <header>
        <h1 className="text-3xl font-bold text-ink-900">Post a trade</h1>
        <p className="mt-1 text-sm text-ink-500">
          Describe what you have, what you want, and where you are. You can edit later.
        </p>
      </header>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Section title="1. What are you offering?">
          <div className="flex gap-2">
            {(["good", "service"] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => {
                  setKind(k);
                  // Reset category to one that fits the new kind
                  setCategory(
                    k === "good" ? "other" : "professional_services"
                  );
                }}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
                  kind === k
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-sand-300 text-ink-700 hover:border-brand-400"
                }`}
              >
                <div className="font-semibold">
                  {k === "good" ? "A good" : "A service"}
                </div>
                <div className="text-xs text-ink-500">
                  {k === "good"
                    ? "A physical item to swap"
                    : "Time, skills, or labor"}
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="2. Pick a category">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((c) => (
              <button
                type="button"
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  category === c.slug
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-sand-300 text-ink-700 hover:border-brand-400"
                }`}
              >
                <span aria-hidden>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="3. Tell people about it">
          <label className="block">
            <span className="label">Title</span>
            <input
              required
              minLength={4}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input mt-1"
              placeholder={
                kind === "good"
                  ? "Acoustic guitar, lightly used"
                  : "Lawn care — 4 hours of mow + trim"
              }
            />
          </label>
          <label className="mt-3 block">
            <span className="label">Description</span>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1"
              placeholder="Details, age/condition, any caveats, when you're available…"
            />
          </label>
          {kind === "good" && (
            <label className="mt-3 block">
              <span className="label">Condition</span>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="input mt-1"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Section>

        <Section title="4. Add photos">
          <PhotoUploader value={photoKeys} onChange={setPhotoKeys} max={8} />
        </Section>

        <Section title="5. What do you want in trade?">
          <textarea
            required
            minLength={2}
            maxLength={500}
            rows={3}
            value={wants}
            onChange={(e) => setWants(e.target.value)}
            className="input"
            placeholder={
              kind === "good"
                ? "Open to ideas — looking for kids' bike, garden tools, or trade for tutoring"
                : "Looking for produce, fresh eggs, or a haircut"
            }
          />
        </Section>

        <Section title="6. Where are you?" subtitle="ZIP + a rough lat/lng. We never show your street address.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="label">ZIP / Postal</span>
              <input
                required
                minLength={3}
                maxLength={12}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="input mt-1"
                placeholder="85003"
              />
            </label>
            <label className="block">
              <span className="label">Latitude</span>
              <input
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="input mt-1"
                placeholder="33.4484"
              />
            </label>
            <label className="block">
              <span className="label">Longitude</span>
              <input
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="input mt-1"
                placeholder="-112.0740"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={geolocate}
            className="btn-ghost mt-2 text-sm"
          >
            📍 Use my current location
          </button>
        </Section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-sand-200 bg-sand-50/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink-500">
              By posting you agree to the Terms.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary"
            >
              {busy ? "Posting…" : "Post trade"}
            </button>
          </div>
        </div>
      </form>
    </Container>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
