// "My Trades" inbox: shows all of the signed-in user's negotiations and
// contracts, with archive + cancel actions where allowed.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  FileSignature,
  MessageSquare,
  ShieldCheck,
  Inbox as InboxIcon,
  XCircle,
} from "lucide-react";
import { Container } from "../ui/Container.js";
import { CATEGORIES } from "../ui/CategoryTile.js";
import { CategoryIcon } from "../ui/CategoryIcons.js";
import { photoUrl } from "../lib/photoUrl.js";
import { api } from "../lib/api.js";

interface NegoRow {
  id: string;
  listing_id: string;
  lister_user_id: string;
  requester_user_id: string;
  offering: string;
  status: string;
  is_archived: number;
  date_modified: number;
  listing_title: string;
  listing_status: string;
  listing_kind: "good" | "service";
  listing_category: string;
  other_name: string;
  firstPhotoKey: string | null;
  message_count: number;
  unread_count: number;
  last_message_body: string | null;
  last_message_at: number | null;
  active_contract_status:
    | "draft"
    | "awaiting_signatures"
    | "signed"
    | null;
  active_contract_id: string | null;
}

interface ContractRow {
  id: string;
  negotiation_id: string;
  listing_id: string;
  party_a_user_id: string;
  party_b_user_id: string;
  party_a_signed_at: number | null;
  party_b_signed_at: number | null;
  status: "draft" | "awaiting_signatures" | "signed" | "cancelled";
  termsJson?: string;
  terms_json?: string;
  date_modified: number;
  listing_title: string;
  listing_category: string;
  firstPhotoKey: string | null;
}

type View = "negotiations" | "contracts";
type NegStatus = "active" | "archived" | "all";
type ContractStatus = "active" | "signed" | "cancelled" | "all";

export default function TradesPage() {
  const [view, setView] = useState<View>("negotiations");
  const [me, setMe] = useState<{ id: string } | null>(null);

  useEffect(() => {
    api<{ id: string }>("/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  return (
    <Container size="lg" className="py-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Your activity
          </p>
          <h1 className="display mt-1 text-3xl text-ink-900">My trades</h1>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </header>

      <div className="mt-6">
        {view === "negotiations" ? (
          <NegotiationsSection me={me} />
        ) : (
          <ContractsSection me={me} />
        )}
      </div>
    </Container>
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
    <div className="inline-flex rounded-xl bg-surface-100 p-1 text-sm">
      <button
        type="button"
        onClick={() => onChange("negotiations")}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${view === "negotiations" ? "bg-white shadow-sm text-ink-900" : "text-ink-500"}`}
      >
        <MessageSquare className="h-4 w-4" /> Negotiations
      </button>
      <button
        type="button"
        onClick={() => onChange("contracts")}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${view === "contracts" ? "bg-white shadow-sm text-ink-900" : "text-ink-500"}`}
      >
        <FileSignature className="h-4 w-4" /> Contracts
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// Negotiations
// ----------------------------------------------------------------------
function NegotiationsSection({ me }: { me: { id: string } | null }) {
  const [status, setStatus] = useState<NegStatus>("active");
  const [items, setItems] = useState<NegoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: NegoRow[] }>(
        `/negotiations?status=${status}`
      );
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function setArchived(id: string, isArchived: boolean) {
    await api(`/negotiations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isArchived }),
    });
    await load();
  }

  async function cancelContract(contractId: string) {
    if (!confirm("Cancel this contract? You can draft a new one afterwards.")) return;
    await api(`/contracts/${contractId}/cancel`, { method: "POST" });
    await load();
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 pb-3">
        <Tabs<NegStatus>
          value={status}
          onChange={setStatus}
          options={[
            { v: "active", label: "Active" },
            { v: "archived", label: "Archived" },
            { v: "all", label: "All" },
          ]}
        />
        <div className="text-xs text-ink-400">
          {loading ? "Loading…" : `${items.length} thread${items.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {loading ? (
        <SkeletonList />
      ) : items.length === 0 ? (
        <EmptyState
          title={
            status === "archived"
              ? "Nothing archived"
              : "No active negotiations yet"
          }
          body={
            status === "archived"
              ? "Negotiations you archive will show up here."
              : "Browse trades and propose one — your conversations will live here."
          }
          ctaLabel="Browse trades"
          ctaTo="/browse"
        />
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <NegoCard
              key={n.id}
              n={n}
              me={me}
              onArchive={() => setArchived(n.id, true)}
              onUnarchive={() => setArchived(n.id, false)}
              onCancelContract={
                n.active_contract_id && n.active_contract_status !== "signed"
                  ? () => cancelContract(n.active_contract_id!)
                  : undefined
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

function NegoCard({
  n,
  me,
  onArchive,
  onUnarchive,
  onCancelContract,
}: {
  n: NegoRow;
  me: { id: string } | null;
  onArchive: () => void;
  onUnarchive: () => void;
  onCancelContract?: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.slug === n.listing_category);
  const youAreLister = me?.id === n.lister_user_id;
  return (
    <li
      className={`card flex gap-3 p-3 ${
        n.unread_count > 0 ? "ring-2 ring-brand-200" : ""
      }`}
    >
      <Link
        to={`/listing/${n.listing_id}`}
        className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl ${cat?.tint ?? "bg-surface-100"}`}
      >
        {n.firstPhotoKey ? (
          <img
            src={photoUrl(n.firstPhotoKey)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className={`flex h-full items-center justify-center ${cat?.iconColor ?? "text-ink-400"}`}>
            <CategoryIcon slug={n.listing_category} className="h-7 w-7" />
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/n/${n.id}`}
              className="flex items-center gap-2 font-semibold text-ink-900 hover:text-ink-700"
            >
              <span className="line-clamp-1">{n.listing_title}</span>
              {n.unread_count > 0 && (
                <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {n.unread_count} new
                </span>
              )}
            </Link>
            <p className="text-xs text-ink-500">
              With <span className="font-medium text-ink-700">{n.other_name}</span>
              {" · "}
              {youAreLister ? "you are listing" : "you are proposing"}
            </p>
            {n.last_message_body && (
              <p className="mt-1 line-clamp-1 text-sm text-ink-700">
                {n.last_message_body}
              </p>
            )}
            <p className="mt-1 text-[11px] text-ink-400">
              {n.message_count} message{n.message_count === 1 ? "" : "s"} ·
              updated {formatRelative(n.last_message_at ?? n.date_modified)}
            </p>
          </div>
          <ContractStatusBadge
            status={n.active_contract_status}
            listingStatus={n.listing_status}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <Link
            to={`/n/${n.id}`}
            className="rounded-lg bg-ink-900 px-2.5 py-1 font-medium text-white hover:bg-ink-800"
          >
            Open
          </Link>
          {onCancelContract && (
            <button
              onClick={onCancelContract}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-800 hover:bg-amber-100"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel contract
            </button>
          )}
          {n.is_archived === 0 ? (
            <button
              onClick={onArchive}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-100 px-2.5 py-1 font-medium text-ink-700 hover:bg-surface-200"
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          ) : (
            <button
              onClick={onUnarchive}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 font-medium text-brand-700 hover:bg-brand-100"
            >
              <ArchiveRestore className="h-3.5 w-3.5" /> Unarchive
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function ContractStatusBadge({
  status,
  listingStatus,
}: {
  status: NegoRow["active_contract_status"];
  listingStatus: string;
}) {
  if (status === "signed" || listingStatus === "traded")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
        <ShieldCheck className="h-3 w-3" /> Signed
      </span>
    );
  if (status === "awaiting_signatures")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
        <FileSignature className="h-3 w-3" /> Awaiting signatures
      </span>
    );
  if (status === "draft")
    return (
      <span className="chip">draft contract</span>
    );
  return <span className="chip">chatting</span>;
}

// ----------------------------------------------------------------------
// Contracts
// ----------------------------------------------------------------------
function ContractsSection({ me }: { me: { id: string } | null }) {
  const [status, setStatus] = useState<ContractStatus>("active");
  const [items, setItems] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: ContractRow[] }>(`/contracts?status=${status}`);
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id: string) {
    if (!confirm("Cancel this contract?")) return;
    await api(`/contracts/${id}/cancel`, { method: "POST" });
    await load();
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 pb-3">
        <Tabs<ContractStatus>
          value={status}
          onChange={setStatus}
          options={[
            { v: "active", label: "Pending / Signed" },
            { v: "signed", label: "Signed" },
            { v: "cancelled", label: "Cancelled" },
            { v: "all", label: "All" },
          ]}
        />
        <div className="text-xs text-ink-400">
          {loading
            ? "Loading…"
            : `${items.length} contract${items.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {loading ? (
        <SkeletonList />
      ) : items.length === 0 ? (
        <EmptyState
          title="No contracts here"
          body="Once you draft and sign a contract it'll show up in this list."
          ctaLabel="My negotiations"
          ctaTo="/trades"
          onClickCta={() => {
            /* user can use the toggle above */
          }}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((c) => {
            const cat = CATEGORIES.find((x) => x.slug === c.listing_category);
            const iAmA = me?.id === c.party_a_user_id;
            const iAmB = me?.id === c.party_b_user_id;
            const mySig = iAmA ? c.party_a_signed_at : c.party_b_signed_at;
            const otherSig = iAmA ? c.party_b_signed_at : c.party_a_signed_at;
            return (
              <li key={c.id} className="card flex gap-3 p-3">
                <Link
                  to={`/listing/${c.listing_id}`}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl ${cat?.tint ?? "bg-surface-100"}`}
                >
                  {c.firstPhotoKey ? (
                    <img
                      src={photoUrl(c.firstPhotoKey)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className={`flex h-full items-center justify-center ${cat?.iconColor ?? "text-ink-400"}`}>
                      <CategoryIcon
                        slug={c.listing_category}
                        className="h-7 w-7"
                      />
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/n/${c.negotiation_id}`}
                        className="line-clamp-1 font-semibold text-ink-900 hover:text-ink-700"
                      >
                        {c.listing_title}
                      </Link>
                      <p className="text-xs text-ink-500">
                        You are <span className="font-medium text-ink-700">
                          Party {iAmA ? "A (lister)" : iAmB ? "B (requester)" : "?"}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        Updated {formatRelative(c.date_modified)}
                      </p>
                    </div>
                    <ContractFullBadge status={c.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-500">
                    <span>
                      You:{" "}
                      {mySig ? (
                        <span className="font-medium text-brand-700">signed</span>
                      ) : (
                        <span className="text-amber-700">not yet</span>
                      )}
                    </span>
                    <span>
                      Other:{" "}
                      {otherSig ? (
                        <span className="font-medium text-brand-700">signed</span>
                      ) : (
                        <span className="text-amber-700">not yet</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <Link
                      to={`/n/${c.negotiation_id}`}
                      className="rounded-lg bg-ink-900 px-2.5 py-1 font-medium text-white hover:bg-ink-800"
                    >
                      Open in negotiation
                    </Link>
                    {c.status !== "signed" && c.status !== "cancelled" && (
                      <button
                        onClick={() => cancel(c.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-800 hover:bg-amber-100"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ContractFullBadge({
  status,
}: {
  status: ContractRow["status"];
}) {
  switch (status) {
    case "signed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
          <ShieldCheck className="h-3 w-3" /> Signed
        </span>
      );
    case "awaiting_signatures":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
          <FileSignature className="h-3 w-3" /> Awaiting
        </span>
      );
    case "draft":
      return <span className="chip">Draft</span>;
    case "cancelled":
      return <span className="chip text-ink-400">Cancelled</span>;
  }
}

// ---------- bits ----------
function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-xl bg-surface-100 p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-lg px-3 py-1.5 font-medium ${value === o.v ? "bg-white shadow-sm text-ink-900" : "text-ink-500"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="card flex h-24 animate-pulse" />
      ))}
    </ul>
  );
}

function EmptyState({
  title,
  body,
  ctaLabel,
  ctaTo,
  onClickCta,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaTo: string;
  onClickCta?: () => void;
}) {
  return (
    <div className="card flex flex-col items-center p-10 text-center">
      <InboxIcon className="h-10 w-10 text-ink-300" strokeWidth={1.5} />
      <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{body}</p>
      <Link
        to={ctaTo}
        onClick={onClickCta}
        className="btn-brand mt-4"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
}
