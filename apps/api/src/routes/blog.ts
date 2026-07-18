// Blog routes.
//
// Public: GET /blog (list published), GET /blog/:slug (single published).
// Admin:  POST /blog (create), PATCH /blog/:id, DELETE /blog/:id (soft),
//         GET /blog/admin/all (drafts + published).

import { Hono } from "hono";
import { and, desc, eq, ne } from "drizzle-orm";
import {
  BlogPostCreateSchema,
  BlogPostUpdateSchema,
} from "@unscrewed/shared";
import { getDb, blogPosts, users } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAdmin } from "../middleware/auth.js";
import { uuidv4 } from "../lib/crypto.js";

export const blogRoutes = new Hono<AppContext>();

// ---------- ADMIN sub-namespace must be declared BEFORE the public
// /:slug route, otherwise Hono matches /blog/admin as slug "admin". ----------

blogRoutes.get("/admin/all", requireAdmin, async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      status: blogPosts.status,
      datePublished: blogPosts.datePublished,
      dateCreated: blogPosts.dateCreated,
      dateModified: blogPosts.dateModified,
    })
    .from(blogPosts)
    .where(eq(blogPosts.isDeleted, 0))
    .orderBy(desc(blogPosts.dateModified));
  return c.json({ items: rows });
});

blogRoutes.get("/admin/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.id, id), eq(blogPosts.isDeleted, 0)))
    .limit(1);
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json(row);
});

blogRoutes.post("/", requireAdmin, async (c) => {
  const userId = c.get("userId")!;
  const json = await c.req.json().catch(() => null);
  const parsed = BlogPostCreateSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const db = getDb(c.env.DB);
  // Slug uniqueness check
  const [existing] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, parsed.data.slug))
    .limit(1);
  if (existing) return c.json({ error: "slug_in_use" }, 409);
  const id = uuidv4();
  const now = Date.now();
  await db.insert(blogPosts).values({
    id,
    slug: parsed.data.slug,
    title: parsed.data.title.trim(),
    excerpt: parsed.data.excerpt?.trim() ?? null,
    bodyMd: parsed.data.bodyMd,
    heroImageUrl: parsed.data.heroImageUrl ?? null,
    authorId: userId,
    status: parsed.data.status,
    datePublished: parsed.data.status === "published" ? now : null,
    dateCreated: now,
    dateModified: now,
  });
  return c.json({ id, slug: parsed.data.slug });
});

blogRoutes.patch("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = BlogPostUpdateSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const db = getDb(c.env.DB);
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);
  if (!row) return c.json({ error: "not_found" }, 404);

  const now = Date.now();
  const upd: Record<string, unknown> = { dateModified: now };
  if (parsed.data.slug !== undefined && parsed.data.slug !== row.slug) {
    const [collision] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(
        and(eq(blogPosts.slug, parsed.data.slug), ne(blogPosts.id, id))
      )
      .limit(1);
    if (collision) return c.json({ error: "slug_in_use" }, 409);
    upd.slug = parsed.data.slug;
  }
  if (parsed.data.title !== undefined) upd.title = parsed.data.title.trim();
  if (parsed.data.excerpt !== undefined)
    upd.excerpt = parsed.data.excerpt?.trim() || null;
  if (parsed.data.bodyMd !== undefined) upd.bodyMd = parsed.data.bodyMd;
  if (parsed.data.heroImageUrl !== undefined)
    upd.heroImageUrl = parsed.data.heroImageUrl || null;
  if (parsed.data.status !== undefined) {
    upd.status = parsed.data.status;
    // First-time publish gets a datePublished; going back to draft leaves
    // it as-is so we don't lose the original publish date.
    if (parsed.data.status === "published" && !row.datePublished)
      upd.datePublished = now;
  }
  await db.update(blogPosts).set(upd as any).where(eq(blogPosts.id, id));
  return c.json({ ok: true });
});

blogRoutes.delete("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  await db
    .update(blogPosts)
    .set({ isDeleted: 1, dateModified: Date.now() })
    .where(eq(blogPosts.id, id));
  return c.json({ ok: true });
});

// ---------- Public ----------

blogRoutes.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      heroImageUrl: blogPosts.heroImageUrl,
      datePublished: blogPosts.datePublished,
      authorName: users.displayName,
    })
    .from(blogPosts)
    .leftJoin(users, eq(users.id, blogPosts.authorId))
    .where(
      and(eq(blogPosts.status, "published"), eq(blogPosts.isDeleted, 0))
    )
    .orderBy(desc(blogPosts.datePublished));
  return c.json({ items: rows });
});

blogRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = getDb(c.env.DB);
  const [row] = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      bodyMd: blogPosts.bodyMd,
      heroImageUrl: blogPosts.heroImageUrl,
      datePublished: blogPosts.datePublished,
      dateModified: blogPosts.dateModified,
      authorName: users.displayName,
    })
    .from(blogPosts)
    .leftJoin(users, eq(users.id, blogPosts.authorId))
    .where(
      and(
        eq(blogPosts.slug, slug),
        eq(blogPosts.status, "published"),
        eq(blogPosts.isDeleted, 0)
      )
    )
    .limit(1);
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json(row);
});
