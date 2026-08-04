import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container } from "../ui/Container.js";
import { CATEGORIES } from "../ui/CategoryTile.js";
import { CategoryIcon } from "../ui/CategoryIcons.js";
import { PhotoUploader } from "../ui/PhotoUploader.js";
import { AddressPicker, type AddressValue } from "../ui/AddressPicker.js";
import { api } from "../lib/api.js";
import { getListingStarter } from "../lib/listingStarters.js";
import { ListingMatchability } from "../ui/ListingMatchability.js";

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
  const [searchParams] = useSearchParams();
  const starter = getListingStarter(searchParams.get("starter"));
  const [kind, setKind] = useState<"good" | "service">(
    starter?.kind ?? "good"
  );
  const [exchangeMode, setExchangeMode] = useState<
    "local" | "remote" | "either"
  >(starter?.exchangeMode ?? "local");
  const [category, setCategory] = useState(starter?.category ?? "other");
  const [title, setTitle] = useState(starter?.title ?? "");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("good");
  const [wants, setWants] = useState(starter?.wants ?? "");
  const [address, setAddress] = useState<AddressValue | null>(null);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{
      homeZip: string | null;
      homeLat: number | null;
      homeLng: number | null;
    }>("/me")
      .then((me) => {
        if (
          me.homeZip &&
          Number.isFinite(me.homeLat) &&
          Number.isFinite(me.homeLng)
        ) {
          setAddress((current) =>
            current ?? {
              display: `ZIP ${me.homeZip}`,
              postcode: me.homeZip!,
              lat: me.homeLat!,
              lng: me.homeLng!,
            }
          );
        }
      })
      .catch(() => {
        // The route is auth-gated. A missing ZIP centroid should not prevent
        // someone from selecting a location manually.
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (exchangeMode !== "remote" && !address) {
      setError("Please pick a location.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/listings", {
        method: "POST",
        body: JSON.stringify({
          kind,
          exchangeMode,
          title,
          description,
          category,
          condition: kind === "good" ? condition : undefined,
          wants,
          countryCode: "US",
          ...(exchangeMode === "remote"
            ? {}
            : {
                // Backend requires postalCode min 3 chars; fall back to a
                // city-level marker if the picked address did not include a
                // ZIP.
                postalCode: address!.postcode || "USA",
                lat: address!.lat,
                lng: address!.lng,
              }),
          photoKeys,
        }),
      });
      nav(`/listing/${r.id}?posted=1`);
    } catch (e: any) {
      const fieldErr = e?.body?.issues?.[0];
      setError(
        fieldErr?.message ?? e?.body?.error ?? e?.message ?? "Failed"
      );
    } finally {
      setBusy(false);
    }
  }

  const categories =
    kind === "good"
      ? CATEGORIES.filter((c) => c.kind !== "service")
      : CATEGORIES.filter((c) => c.kind !== "good");
  const requiredDetails = [
    {
      label: "A specific title",
      complete: title.trim().length >= 4,
    },
    {
      label: "An accurate description",
      complete: description.trim().length >= 10,
    },
    {
      label: "What you would accept in trade",
      complete: wants.trim().length >= 2,
    },
    ...(exchangeMode === "remote"
      ? []
      : [
          {
            label: "An approximate exchange area",
            complete: address !== null,
          },
        ]),
  ];
  const requiredRemaining = requiredDetails.filter(
    (detail) => !detail.complete
  ).length;
  const readyToPost = requiredRemaining === 0;

  return (
    <Container size="md" className="py-8">
      <header>
        <h1 className="text-3xl font-bold text-ink-900">Post a trade</h1>
        <p className="mt-1 text-sm text-ink-500">
          Describe what you have, what you want, and where you are. You can
          edit later.
        </p>
        {starter && (
          <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
            <strong>{starter.label} starter loaded.</strong> We selected a
            category and suggested editable wording. Add your own accurate
            details before posting; nothing is posted automatically.
          </div>
        )}
        <div
          className="mt-4 rounded-2xl border border-surface-200 bg-white p-4 shadow-card"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <strong className="text-sm text-ink-900">
              {readyToPost
                ? "Required details complete"
                : `${requiredRemaining} required ${requiredRemaining === 1 ? "detail" : "details"} remaining`}
            </strong>
            <span className="text-xs text-ink-400">
              Photos are optional
            </span>
          </div>
          <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            {requiredDetails.map((detail) => (
              <li
                key={detail.label}
                className={
                  detail.complete ? "text-brand-700" : "text-ink-500"
                }
              >
                <span aria-hidden>{detail.complete ? "✓" : "○"}</span>{" "}
                {detail.label}
              </li>
            ))}
          </ul>
        </div>
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
                    ? "border-ink-900 bg-surface-100 text-ink-900"
                    : "border-surface-300 text-ink-700 hover:border-ink-700"
                }`}
              >
                <CategoryIcon slug={c.slug} className="h-4 w-4" />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="3. How can you exchange?"
          subtitle="This controls who can realistically discover and receive this offer."
        >
          <ExchangeModePicker value={exchangeMode} onChange={setExchangeMode} />
        </Section>

        <Section title="4. Tell people about it">
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
              placeholder={
                starter?.descriptionPlaceholder ??
                "Details, age/condition, any caveats, when you're available…"
              }
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

        <Section
          title="5. Add photos (optional)"
          subtitle="A clear photo can build confidence, but you can post a truthful offer without one."
        >
          <PhotoUploader value={photoKeys} onChange={setPhotoKeys} max={8} />
        </Section>

        <Section title="6. What do you want in trade?">
          <textarea
            required
            minLength={2}
            maxLength={500}
            rows={3}
            value={wants}
            onChange={(e) => setWants(e.target.value)}
            className="input"
            placeholder={
              starter?.wantsPlaceholder ??
              (kind === "good"
                ? "Open to ideas — looking for kids' bike, garden tools, or trade for tutoring"
                : "Looking for produce, fresh eggs, or a haircut")
            }
          />
        </Section>

        {(title.trim() || description.trim() || wants.trim()) && (
          <ListingMatchability
            input={{
              kind,
              title,
              description,
              wants,
              photoCount: photoKeys.length,
            }}
          />
        )}

        {exchangeMode === "remote" ? (
          <Section
            title="7. Nationwide reach"
            subtitle="Remote-only offers are listed across the United States. Your account’s home ZIP is not shown on this offer, and you do not need to choose a map location."
          >
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-900">
              This offer will be labeled <strong>Remote</strong> and kept off
              local maps and new-nearby email alerts.
            </div>
          </Section>
        ) : (
          <Section
            title="7. Where are you?"
            subtitle="Your account ZIP is filled in when available. Keep it or pick a different neighborhood, ZIP, or street. We only show an approximate area."
          >
            <AddressPicker value={address} onChange={setAddress} />
          </Section>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-sand-200 bg-sand-50/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-ink-500">
              <p>
                {readyToPost
                  ? "Ready to post. You can edit the offer later."
                  : `Complete ${requiredRemaining} required ${requiredRemaining === 1 ? "detail" : "details"} above.`}
              </p>
              <p className="mt-0.5 text-ink-400">
                By posting you agree to the Terms.
              </p>
            </div>
            <button
              type="submit"
              disabled={busy || !readyToPost}
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

function ExchangeModePicker({
  value,
  onChange,
}: {
  value: "local" | "remote" | "either";
  onChange: (value: "local" | "remote" | "either") => void;
}) {
  const options = [
    {
      value: "local" as const,
      title: "In person",
      body: "Pickup, delivery, or face-to-face service near your chosen area.",
    },
    {
      value: "remote" as const,
      title: "Remote",
      body: "A skill or service that can be exchanged anywhere in the U.S.",
    },
    {
      value: "either" as const,
      title: "Either",
      body: "You can complete this exchange locally or remotely.",
    },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-xl border p-3 text-left transition-colors ${
            value === option.value
              ? "border-brand-500 bg-brand-50 text-brand-900"
              : "border-surface-300 text-ink-700 hover:border-brand-400"
          }`}
        >
          <span className="block text-sm font-semibold">{option.title}</span>
          <span className="mt-1 block text-xs leading-relaxed opacity-75">
            {option.body}
          </span>
        </button>
      ))}
    </div>
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
