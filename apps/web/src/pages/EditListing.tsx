// Owner or admin edit for an existing listing. Reuses the same section
// primitives / form controls as NewListing so the two pages feel like one.

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save, Trash2, XCircle } from "lucide-react";
import { Container } from "../ui/Container.js";
import { CATEGORIES } from "../ui/CategoryTile.js";
import { CategoryIcon } from "../ui/CategoryIcons.js";
import { PhotoUploader } from "../ui/PhotoUploader.js";
import { AddressPicker, type AddressValue } from "../ui/AddressPicker.js";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.js";

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "na", label: "Not applicable" },
];

interface ListingDetail {
  id: string;
  user_id?: string;
  userId?: string;
  kind: "good" | "service";
  title: string;
  description: string;
  category: string;
  condition: string | null;
  wants: string;
  postal_code?: string;
  postalCode?: string;
  lat: number;
  lng: number;
  status: string;
}
interface PhotoRow {
  id: string;
  r2_key?: string;
  r2Key?: string;
}

export default function EditListing() {
  const { id } = useParams();
  const nav = useNavigate();
  const { session } = useSession();

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"good" | "service">("good");
  const [category, setCategory] = useState("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("good");
  const [wants, setWants] = useState("");
  const [status, setStatus] = useState<"active" | "withdrawn">("active");
  const [address, setAddress] = useState<AddressValue | null>(null);
  const [originalAddress, setOriginalAddress] = useState<{
    postalCode: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<{ listing: ListingDetail; photos: PhotoRow[] }>(`/listings/${id}`)
      .then((r) => {
        const l = r.listing;
        // Ownership check — belt & suspenders; backend enforces too.
        const ownerId = l.user_id ?? l.userId;
        if (
          session?.authenticated &&
          ownerId !== session.userId &&
          !session.isAdmin
        ) {
          setError("You don't own this listing.");
          setLoaded(true);
          return;
        }
        setKind(l.kind);
        setCategory(l.category);
        setTitle(l.title);
        setDescription(l.description);
        setCondition(l.condition ?? "good");
        setWants(l.wants);
        setStatus((l.status as "active" | "withdrawn") ?? "active");
        setPhotoKeys(r.photos.map((p) => p.r2_key ?? p.r2Key!).filter(Boolean));
        setOriginalAddress({
          postalCode: l.postal_code ?? l.postalCode ?? "",
          lat: l.lat,
          lng: l.lng,
        });
        setLoaded(true);
      })
      .catch((e) => {
        setError(e?.body?.error ?? e?.message ?? "Could not load listing");
        setLoaded(true);
      });
  }, [id, session?.userId, session?.isAdmin, session?.authenticated]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        category,
        condition: kind === "good" ? condition : undefined,
        wants,
        status,
        photoKeys,
      };
      // Only send address fields if the user picked a new location.
      if (address) {
        body.postalCode = address.postcode || "USA";
        body.lat = address.lat;
        body.lng = address.lng;
      }
      await api(`/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      nav(`/listing/${id}`);
    } catch (e: any) {
      const fieldErr = e?.body?.issues?.[0];
      setError(
        fieldErr?.message ?? e?.body?.error ?? e?.message ?? "Save failed"
      );
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (
      !confirm(
        "Withdraw this trade? It won't show up in browse/search. You can reactivate it later."
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "withdrawn" }),
      });
      nav(`/listing/${id}`);
    } catch (e: any) {
      setError(e?.body?.error ?? e?.message ?? "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  async function softDelete() {
    if (
      !confirm(
        "Delete this trade? It disappears everywhere. Admins can restore later if you change your mind."
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/admin/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDeleted: true }),
      });
      nav("/browse");
    } catch (e: any) {
      // Non-admins won't have access to the admin endpoint; fall back to
      // "withdrawn" so they at least hide it.
      try {
        await api(`/listings/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "withdrawn" }),
        });
        nav("/trades");
      } catch (e2: any) {
        setError(
          e2?.body?.error ?? e2?.message ?? e?.message ?? "Delete failed"
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <Container size="md" className="py-10">
        <div className="card h-40 animate-pulse" />
      </Container>
    );
  }
  if (error && !title) {
    return (
      <Container size="md" className="py-10">
        <div className="card p-6 text-center text-ink-700">
          <p>{error}</p>
          <Link to="/browse" className="btn-brand mt-4 inline-flex">
            Back to browse
          </Link>
        </div>
      </Container>
    );
  }

  const categories =
    kind === "good"
      ? CATEGORIES.filter((c) => c.kind !== "service")
      : CATEGORIES.filter((c) => c.kind !== "good");

  return (
    <Container size="md" className="py-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">Edit trade</h1>
          <p className="mt-1 text-sm text-ink-500">
            You're editing your own listing. Kind (good vs service) is fixed
            — post a new one if you want to change it.
          </p>
        </div>
        <Link
          to={`/listing/${id}`}
          className="btn-ghost text-sm"
        >
          View
        </Link>
      </header>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Section title="Category">
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

        <Section title="Details">
          <label className="block">
            <span className="label">Title</span>
            <input
              required
              minLength={4}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input mt-1"
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

        <Section title="Photos">
          <PhotoUploader value={photoKeys} onChange={setPhotoKeys} max={8} />
        </Section>

        <Section title="What do you want in trade?">
          <textarea
            required
            minLength={2}
            maxLength={500}
            rows={3}
            value={wants}
            onChange={(e) => setWants(e.target.value)}
            className="input"
          />
        </Section>

        <Section
          title="Location"
          subtitle={
            originalAddress
              ? `Current: ZIP ${originalAddress.postalCode}. Pick a new address to change it.`
              : "Pick an address to attach a location."
          }
        >
          <AddressPicker value={address} onChange={setAddress} />
        </Section>

        <Section title="Status">
          <div className="flex flex-wrap gap-2 text-sm">
            {(["active", "withdrawn"] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-xl border px-3 py-2 font-medium transition-colors ${
                  status === s
                    ? "border-ink-900 bg-surface-100 text-ink-900"
                    : "border-surface-300 text-ink-700 hover:border-ink-700"
                }`}
              >
                {s === "active" ? "Active — visible in browse" : "Withdrawn — hidden"}
              </button>
            ))}
          </div>
        </Section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-surface-200 bg-surface-50/95 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={withdraw}
                disabled={busy || status === "withdrawn"}
                className="btn-outline text-sm"
                title="Hide from browse but keep the record"
              >
                <XCircle className="h-4 w-4" strokeWidth={2} />
                Withdraw
              </button>
              <button
                type="button"
                onClick={softDelete}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
                Delete
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/listing/${id}`} className="btn-ghost text-sm">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={busy}
                className="btn-brand"
              >
                <Save className="h-4 w-4" strokeWidth={2} />
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
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
