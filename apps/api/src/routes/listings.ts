import { Hono } from "hono";
import { eq } from "drizzle-orm";
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
  const raw: Record<string, unknown> = {};
  new URL(c.req.url).searchParams.forEach((v, k) => {
    raw[k] = v;
  });
  // Coerce numeric query strings
  for (const k of ["north", "south", "east", "west", "lat", "lng", "radiusKm", "limit"]) {
    if (raw[k] !== undefined) (raw as any)[k] = Number(raw[k]);
  }
  const parsed = ListingSearchSchema.safeParse(raw);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const q = parsed.data;
  // Subquery to attach the first (lowest sort_order) photo key to each row.
  // Cheap enough at our scale; revisit if listing volume grows.
  const photoSubquery = `(
    SELECT lp.r2_key FROM listing_photos lp
    WHERE lp.listing_id = l.id
    ORDER BY lp.sort_order ASC LIMIT 1
  ) AS firstPhotoKey`;

  // FTS5 full-text query
  if (q.q && q.q.trim().length > 0) {
    const term = q.q.trim().replace(/[^\w\s]/g, " ");
    const rows = await c.env.DB.prepare(
      `SELECT l.*, ${photoSubquery} FROM listings l
       JOIN listings_fts ON listings_fts.rowid = l.rowid
       WHERE listings_fts MATCH ?1
         AND l.status = 'active' AND l.is_deleted = 0
       ORDER BY rank LIMIT ?2`
    )
      .bind(term, q.limit)
      .all();
    return c.json({ items: rows.results });
  }

  // Build the equivalent of drizzle's filter via raw SQL so we can add the
  // photo subquery in the same trip.
  const where: string[] = ["l.status = 'active'", "l.is_deleted = 0"];
  const binds: any[] = [];
  if (q.category) {
    where.push("l.category = ?");
    binds.push(q.category);
  }
  if (q.kind) {
    where.push("l.kind = ?");
    binds.push(q.kind);
  }
  if (
    q.north !== undefined &&
    q.south !== undefined &&
    q.east !== undefined &&
    q.west !== undefined
  ) {
    where.push("l.lat BETWEEN ? AND ?");
    binds.push(q.south, q.north);
    where.push("l.lng BETWEEN ? AND ?");
    binds.push(q.west, q.east);
  } else if (q.lat !== undefined && q.lng !== undefined) {
    const precision = q.radiusKm && q.radiusKm > 50 ? 3 : 4;
    const center = ngeohash.encode(q.lat, q.lng, precision);
    where.push(`substr(l.geohash, 1, ${precision}) = ?`);
    binds.push(center);
  }
  binds.push(q.limit);

  const rows = await c.env.DB.prepare(
    `SELECT l.*, ${photoSubquery} FROM listings l
     WHERE ${where.join(" AND ")}
     ORDER BY l.date_created DESC
     LIMIT ?`
  )
    .bind(...binds)
    .all();
  return c.json({ items: rows.results });
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
