import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api } from "../../lib/api.js";

interface AdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: "draft" | "published";
  datePublished: number | null;
  dateCreated: number;
  dateModified: number;
}

export default function AdminBlogList() {
  const [items, setItems] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: AdminPost[] }>("/blog/admin/all");
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? Soft-delete — admins can undo via SQL.`))
      return;
    await api(`/blog/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">Blog</h1>
        <Link to="/admin/blog/new" className="btn-brand">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New post
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-100 text-left text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-ink-500">
                    No posts yet.{" "}
                    <Link
                      to="/admin/blog/new"
                      className="text-brand-700 hover:underline"
                    >
                      Write the first one
                    </Link>
                    .
                  </td>
                </tr>
              )}
              {items.map((p) => (
                <tr key={p.id} className="border-t border-surface-200">
                  <td className="p-3">
                    <Link
                      to={`/admin/blog/${p.id}/edit`}
                      className="font-medium text-ink-900 hover:text-brand-700"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-ink-400">/{p.slug}</div>
                  </td>
                  <td className="p-3">
                    {p.status === "published" ? (
                      <span className="chip-brand">published</span>
                    ) : (
                      <span className="chip bg-amber-50 text-amber-800">
                        draft
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-ink-500">
                    {new Date(p.dateModified).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Link
                        to={`/admin/blog/${p.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg bg-ink-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-800"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={2.5} /> Edit
                      </Link>
                      {p.status === "published" && (
                        <Link
                          to={`/blog/${p.slug}`}
                          className="rounded-lg bg-surface-100 px-2 py-1 text-xs font-medium text-ink-700 hover:bg-surface-200"
                        >
                          View
                        </Link>
                      )}
                      <button
                        onClick={() => remove(p.id, p.title)}
                        className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
