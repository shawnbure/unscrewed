// Serves /sitemap.xml and /robots.txt for unscrewed.lol.
// Proxied from the site origin via apps/web/_redirects.
//
// Sitemap contents:
//   - static marketing pages (hand-listed)
//   - every published, non-deleted blog post keyed by slug
//   - every listing that isn't archived or deleted keyed by id

import { Hono } from "hono";
import { and, eq, desc } from "drizzle-orm";
import { getDb, listings, blogPosts } from "@unscrewed/db";
import type { AppContext } from "../env.js";

export const sitemapRoutes = new Hono<AppContext>();

const SITE = "https://unscrewed.lol";

// Marketing / stable-URL pages worth indexing. Auth-required routes
// (/account, /trades, /admin, /n/:id) are intentionally excluded.
const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/browse", changefreq: "daily", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/thoughts", changefreq: "weekly", priority: "0.7" },
  { path: "/community", changefreq: "weekly", priority: "0.6" },
  { path: "/umass", changefreq: "monthly", priority: "0.7" },
  { path: "/public-benefit", changefreq: "weekly", priority: "0.7" },
  { path: "/safety", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/signup", changefreq: "monthly", priority: "0.5" },
  { path: "/login", changefreq: "monthly", priority: "0.4" },
  { path: "/tos", changefreq: "monthly", priority: "0.3" },
];

function xmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ch === "&"
      ? "&amp;"
      : ch === "<"
        ? "&lt;"
        : ch === ">"
          ? "&gt;"
          : ch === '"'
            ? "&quot;"
            : "&apos;"
  );
}

function iso(ts: number | null | undefined): string {
  const d = ts ? new Date(ts) : new Date();
  return d.toISOString().slice(0, 10);
}

async function loadSitemapEntries(db: ReturnType<typeof getDb>) {
  const [pubBlog, activeListings] = await Promise.all([
    db
      .select({
        slug: blogPosts.slug,
        dateModified: blogPosts.dateModified,
        datePublished: blogPosts.datePublished,
      })
      .from(blogPosts)
      .where(and(eq(blogPosts.status, "published"), eq(blogPosts.isDeleted, 0)))
      .orderBy(desc(blogPosts.dateModified))
      .limit(5000),
    db
      .select({
        id: listings.id,
        dateModified: listings.dateModified,
      })
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          eq(listings.isArchived, 0),
          eq(listings.isDeleted, 0)
        )
      )
      .orderBy(desc(listings.dateModified))
      .limit(45_000),
  ]);

  return {
    pubBlog,
    activeListings,
    urls: [
      ...STATIC_PAGES.map((p) => `${SITE}${p.path}`),
      ...pubBlog.map((b) => `${SITE}/blog/${b.slug}`),
      ...activeListings.map((l) => `${SITE}/listing/${l.id}`),
    ],
  };
}

sitemapRoutes.get("/sitemap.xml", async (c) => {
  const db = getDb(c.env.DB);
  const { pubBlog, activeListings } = await loadSitemapEntries(db);

  const urls: string[] = [];

  for (const p of STATIC_PAGES) {
    urls.push(
      `<url><loc>${SITE}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
    );
  }
  for (const b of pubBlog) {
    const lastmod = iso(b.dateModified ?? b.datePublished);
    urls.push(
      `<url><loc>${SITE}/blog/${xmlEscape(b.slug)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
    );
  }
  for (const l of activeListings) {
    urls.push(
      `<url><loc>${SITE}/listing/${xmlEscape(l.id)}</loc><lastmod>${iso(l.dateModified)}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=1800",
    },
  });
});

sitemapRoutes.get("/sitemap.txt", async (c) => {
  const db = getDb(c.env.DB);
  const { urls } = await loadSitemapEntries(db);

  return new Response(`${urls.join("\n")}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=1800",
    },
  });
});

sitemapRoutes.get("/robots.txt", (c) => {
  const body = `User-agent: *
Disallow: /account
Disallow: /trades
Disallow: /admin
Disallow: /n/
Disallow: /listing/*/edit

Sitemap: ${SITE}/sitemap.txt
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
});
