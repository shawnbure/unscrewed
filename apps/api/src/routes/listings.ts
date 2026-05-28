import { Hono } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import ngeohash from "ngeohash";
import {
  ListingCreateSchema,
  ListingSearchSchema,
} from "@unscrewed/shared";
import { getDb, listings, listingPhotos } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { uuidv4 } from "../lib/crypto.js";

export const listingsRoutes = new Hono<AppContext>();

// ---------------- search (public) ----------------
listingsRoutes.get("/", optionalAuth, async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  // Coerce numeric query strings
  for (const k of ["north", "south", "east", "west", "lat", "lng", "radiusKm", "limit"]) {
    if (raw[k] !== undefined) (raw as any)[k] = Number(raw[k]);
  }
  const parsed = ListingSearchSchema.safeParse(raw);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const q = parsed.data;
  const db = getDb(c.env.DB);

  const conditions = [eq(listings.status, "active"), eq(listings.isDeleted, 0)];
  if (q.category) conditions.push(eq(listings.category, q.category));
  if (q.kind) conditions.push(eq(listings.kind, q.kind));

  // Bounding-box filter
  if (
    q.north !== undefined &&
    q.south !== undefined &&
    q.east !== undefined &&
    q.west !== undefined
  ) {
    conditions.push(sql`${listings.lat} BETWEEN ${q.south} AND ${q.north}`);
    conditions.push(sql`${listings.lng} BETWEEN ${q.west} AND ${q.east}`);
  } else if (q.lat !== undefined && q.lng !== undefined) {
    // Radius via geohash prefix narrowing (cheap; refine in app)
    const precision = q.radiusKm && q.radiusKm > 50 ? 3 : 4;
    const center = ngeohash.encode(q.lat, q.lng, precision);
    conditions.push(sql`substr(${listings.geohash}, 1, ${precision}) = ${center}`);
  }

  // FTS5 full-text query
  if (q.q && q.q.trim().length > 0) {
    const term = q.q.trim().replace(/[^\w\s]/g, " ");
    const rows = await c.env.DB.prepare(
      `SELECT l.* FROM listings l
       JOIN listings_fts ON listings_fts.rowid = l.rowid
       WHERE listings_fts MATCH ?1
         AND l.status = 'active' AND l.is_deleted = 0
       ORDER BY rank LIMIT ?2`
    )
      .bind(term, q.limit)
      .all();
    return c.json({ items: rows.results });
  }

  const rows = await db
    .select()
    .from(listings)
    .where(and(...conditions))
    .orderBy(desc(listings.dateCreated))
    .limit(q.limit);

  return c.json({ items: rows });
});

// ---------------- get single (public) ----------------
listingsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!row[0]) return c.json({ error: "not_found" }, 404);
  const photos = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, id));
  return c.json({ listing: row[0], photos });
});

// ---------------- create ----------------
listingsRoutes.post("/", requireAuth, async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ListingCreateSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const input = parsed.data;
  const userId = c.get("userId")!;
  const id = uuidv4();
  const geohash = ngeohash.encode(input.lat, input.lng, 7);

  const db = getDb(c.env.DB);
  await db.insert(listings).values({
    id,
    userId,
    kind: input.kind,
    title: input.title,
    description: input.description,
    category: input.category,
    condition: input.condition,
    wants: input.wants,
    postalCode: input.postalCode,
    countryCode: input.countryCode,
    lat: input.lat,
    lng: input.lng,
    geohash,
  });
  if (input.photoKeys.length > 0) {
    await db.insert(listingPhotos).values(
      input.photoKeys.map((key, i) => ({
        id: uuidv4(),
        listingId: id,
        r2Key: key,
        sortOrder: i,
      }))
    );
  }

  // Keep FTS in sync. (No triggers — explicit upsert keeps SQL portable.)
  await c.env.DB.prepare(
    `INSERT INTO listings_fts(rowid, title, description, wants)
     SELECT rowid, title, description, wants FROM listings WHERE id = ?1`
  )
    .bind(id)
    .run();

  return c.json({ id });
});

// ---------------- photo upload presign ----------------
// Returns a one-shot R2 key the client PUTs to via /listings/photos/:key.
listingsRoutes.post("/photos/presign", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const key = `listings/${userId}/${uuidv4()}`;
  return c.json({ key, uploadUrl: `/listings/photos/${encodeURIComponent(key)}` });
});

listingsRoutes.put("/photos/:key", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const key = decodeURIComponent(c.req.param("key"));
  if (!key.startsWith(`listings/${userId}/`))
    return c.json({ error: "forbidden" }, 403);
  const ct = c.req.header("content-type") ?? "application/octet-stream";
  if (!ct.startsWith("image/"))
    return c.json({ error: "only_images" }, 400);
  const body = await c.req.arrayBuffer();
  if (body.byteLength > 8 * 1024 * 1024)
    return c.json({ error: "too_large" }, 413);
  await c.env.PHOTOS.put(key, body, { httpMetadata: { contentType: ct } });
  return c.json({ ok: true, key });
});

listingsRoutes.get("/photos/:key", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  const obj = await c.env.PHOTOS.get(key);
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
});
