import { Hono } from "hono";
import { eq } from "drizzle-orm";
import ngeohash from "ngeohash";
import {
  ListingCreateSchema,
  ListingSearchSchema,
  ListingUpdateSchema,
} from "@unscrewed/shared";
import { classifyText, classifyImage } from "../lib/moderationAi.js";
import { logModAction } from "./reports.js";
import { getDb, listings, listingPhotos } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { uuidv4 } from "../lib/crypto.js";
import { notifyLocalListingWatchers } from "../lib/localListingEmail.js";
import {
  REMOTE_MARKET_LOCATION,
  resolveCreateListingLocation,
} from "../lib/listingLocation.js";

export const listingsRoutes = new Hono<AppContext>();

/**
 * Public listing responses never expose the coordinate a member selected.
 *
 * A five-character geohash cell is roughly neighborhood scale (about 5 km
 * wide at mid-latitudes). Returning its center keeps the browse map useful
 * without turning a listing into a pin on someone's home or dorm.
 */
export function publicListing(
  row: Record<string, any>,
  options: { isOwner?: boolean } = {}
) {
  const exchangeMode = row.exchangeMode ?? row.exchange_mode ?? "local";
  const geohash = String(row.geohash ?? "");
  const fallbackLat = Number(row.lat ?? 0);
  const fallbackLng = Number(row.lng ?? 0);
  const cell = exchangeMode === "remote"
    ? {
        latitude: REMOTE_MARKET_LOCATION.lat,
        longitude: REMOTE_MARKET_LOCATION.lng,
      }
    : geohash.length >= 5
      ? ngeohash.decode(geohash.slice(0, 5))
      : {
          latitude: Math.round(fallbackLat * 100) / 100,
          longitude: Math.round(fallbackLng * 100) / 100,
        };

  return {
    id: row.id,
    kind: row.kind,
    exchangeMode,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition ?? null,
    wants: row.wants,
    postalCode:
      exchangeMode === "remote"
        ? REMOTE_MARKET_LOCATION.postalCode
        : row.postalCode ?? row.postal_code,
    countryCode:
      exchangeMode === "remote"
        ? REMOTE_MARKET_LOCATION.countryCode
        : row.countryCode ?? row.country_code,
    lat: cell.latitude,
    lng: cell.longitude,
    status: row.status,
    dateCreated: row.dateCreated ?? row.date_created,
    dateModified: row.dateModified ?? row.date_modified,
    firstPhotoKey: row.firstPhotoKey ?? row.first_photo_key,
    ...(options.isOwner === undefined ? {} : { isOwner: options.isOwner }),
  };
}

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

  // Build one query for both browsing and FTS so category, kind, and location
  // keep applying when someone types a search term.
  const where: string[] = ["l.status = 'active'", "l.is_deleted = 0"];
  const binds: any[] = [];
  let join = "";
  let orderBy = "l.date_created DESC";

  if (q.q && q.q.trim().length > 0) {
    const term = q.q.trim().replace(/[^\w\s]/g, " ").trim();
    if (!term) return c.json({ items: [] });
    join = "JOIN listings_fts ON listings_fts.rowid = l.rowid";
    where.push("listings_fts MATCH ?");
    binds.push(term);
    orderBy = "rank";
  }
  if (q.category) {
    where.push("l.category = ?");
    binds.push(q.category);
  }
  if (q.kind) {
    where.push("l.kind = ?");
    binds.push(q.kind);
  }
  if (q.exchangeMode === "remote") {
    where.push("l.exchange_mode IN ('remote', 'either')");
  } else if (q.exchangeMode === "local") {
    where.push("l.exchange_mode IN ('local', 'either')");
  }
  if (q.postalCode) {
    // A member's home ZIP does not turn remote supply into local-circle
    // inventory. Only listings that can genuinely be exchanged in this ZIP
    // belong on its circle landing.
    where.push("l.exchange_mode IN ('local', 'either')");
    where.push("l.postal_code = ?");
    binds.push(q.postalCode);
  }

  const hasBounds =
    q.north !== undefined &&
    q.south !== undefined &&
    q.east !== undefined &&
    q.west !== undefined;
  const hasCenter = q.lat !== undefined && q.lng !== undefined;
  if (q.exchangeMode !== "remote" && hasBounds) {
    // Quantize before filtering so repeated public viewport queries cannot be
    // used as an oracle to reconstruct the stored exact coordinate.
    const localBounds =
      "(ROUND(l.lat, 1) BETWEEN ? AND ? AND ROUND(l.lng, 1) BETWEEN ? AND ?)";
    where.push(
      q.exchangeMode === "local"
        ? localBounds
        : `(l.exchange_mode IN ('remote', 'either') OR (l.exchange_mode = 'local' AND ${localBounds}))`
    );
    binds.push(q.south, q.north, q.west, q.east);
  } else if (q.exchangeMode !== "remote" && hasCenter) {
    // Filter on coordinates quantized to roughly 11 km latitude cells. This
    // keeps local discovery useful without allowing repeated radius queries
    // to reveal the exact location stored for a listing. A coarse bounding
    // box also avoids the hard cell-edge exclusions caused by geohash-prefix
    // filtering around a campus or neighborhood.
    const centerLat = q.lat!;
    const centerLng = q.lng!;
    const radiusKm = q.radiusKm ?? 25;
    const latitudeDelta = radiusKm / 111.32;
    const longitudeScale = Math.max(
      Math.cos((centerLat * Math.PI) / 180),
      0.1
    );
    const longitudeDelta = radiusKm / (111.32 * longitudeScale);
    const localBounds =
      "(ROUND(l.lat, 1) BETWEEN ? AND ? AND ROUND(l.lng, 1) BETWEEN ? AND ?)";
    where.push(
      q.exchangeMode === "local"
        ? localBounds
        : `(l.exchange_mode IN ('remote', 'either') OR (l.exchange_mode = 'local' AND ${localBounds}))`
    );
    binds.push(
      Math.max(-90, centerLat - latitudeDelta),
      Math.min(90, centerLat + latitudeDelta),
      Math.max(-180, centerLng - longitudeDelta),
      Math.min(180, centerLng + longitudeDelta)
    );
  }
  binds.push(q.limit);

  const rows = await c.env.DB.prepare(
    `SELECT l.*, ${photoSubquery} FROM listings l
     ${join}
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ?`
  )
    .bind(...binds)
    .all();
  return c.json({
    items: (rows.results as Record<string, any>[]).map((row) =>
      publicListing(row)
    ),
  });
});

// ---------------- get single (public) ----------------
listingsRoutes.get("/:id", optionalAuth, async (c) => {
  const id = c.req.param("id");
  const viewerId = c.get("userId");
  const isAdmin = c.get("isAdmin") === true;
  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  const listing = row[0];
  // Hide soft-deleted or archived listings from the public detail endpoint.
  if (!listing || listing.isDeleted === 1 || listing.isArchived === 1)
    return c.json({ error: "not_found" }, 404);
  const photos = await db
    .select({
      r2Key: listingPhotos.r2Key,
      sortOrder: listingPhotos.sortOrder,
    })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, id));
  return c.json({
    listing: publicListing(listing, {
      isOwner: isAdmin || viewerId === listing.userId,
    }),
    photos,
  });
});

// ---------------- create ----------------
listingsRoutes.post("/", requireAuth, async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ListingCreateSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const input = parsed.data;
  const userId = c.get("userId")!;

  // Text safety gate — block on hard "unsafe" verdict from LlamaGuard.
  const mod = await classifyText(c.env, [input.title, input.description, input.wants]);
  if (mod.verdict === "block") {
    return c.json(
      { error: "content_blocked", categories: mod.categories },
      422
    );
  }

  const id = uuidv4();
  const location = resolveCreateListingLocation(input);
  const geohash = ngeohash.encode(location.lat, location.lng, 7);

  const db = getDb(c.env.DB);
  await db.insert(listings).values({
    id,
    userId,
    kind: input.kind,
    exchangeMode: input.exchangeMode,
    title: input.title,
    description: input.description,
    category: input.category,
    condition: input.condition,
    wants: input.wants,
    postalCode: location.postalCode,
    countryCode: location.countryCode,
    lat: location.lat,
    lng: location.lng,
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

  c.executionCtx.waitUntil(
    notifyLocalListingWatchers(c.env, {
      listingId: id,
      ownerUserId: userId,
      title: input.title,
      wants: input.wants,
      postalCode: location.postalCode,
      lat: location.lat,
      lng: location.lng,
      exchangeMode: input.exchangeMode,
    }).catch((error) => {
      console.error("[local-listing-email] send failed", error);
    })
  );

  return c.json({ id });
});

// ---------------- edit (owner or admin) ----------------
listingsRoutes.patch("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const isAdmin = c.get("isAdmin") === true;
  const id = c.req.param("id");
  const json = await c.req.json().catch(() => null);
  const parsed = ListingUpdateSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const input = parsed.data;

  const db = getDb(c.env.DB);
  const [row] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!row || row.isDeleted === 1)
    return c.json({ error: "not_found" }, 404);
  if (row.userId !== userId && !isAdmin)
    return c.json({ error: "forbidden" }, 403);

  const now = Date.now();
  const upd: Record<string, unknown> = { dateModified: now };
  if (input.title !== undefined) upd.title = input.title.trim();
  if (input.description !== undefined) upd.description = input.description.trim();
  if (input.wants !== undefined) upd.wants = input.wants.trim();
  if (input.category !== undefined) upd.category = input.category;
  if (input.exchangeMode !== undefined) upd.exchangeMode = input.exchangeMode;
  if (input.condition !== undefined) upd.condition = input.condition;
  if (input.status !== undefined) upd.status = input.status;
  if (input.postalCode !== undefined) upd.postalCode = input.postalCode;
  if (input.lat !== undefined) upd.lat = input.lat;
  if (input.lng !== undefined) upd.lng = input.lng;
  if (input.lat !== undefined && input.lng !== undefined) {
    upd.geohash = ngeohash.encode(input.lat, input.lng, 7);
  }

  // Re-scan text if any indexed field changed
  if (
    input.title !== undefined ||
    input.description !== undefined ||
    input.wants !== undefined
  ) {
    const modUpd = await classifyText(c.env, [
      (input.title ?? row.title),
      (input.description ?? row.description),
      (input.wants ?? row.wants),
    ]);
    if (modUpd.verdict === "block") {
      return c.json(
        { error: "content_blocked", categories: modUpd.categories },
        422
      );
    }
  }

  const indexedTextChanged =
    input.title !== undefined ||
    input.description !== undefined ||
    input.wants !== undefined;
  const rowId = indexedTextChanged
    ? await c.env.DB.prepare(
        "SELECT rowid FROM listings WHERE id = ?1"
      )
        .bind(id)
        .first<number>("rowid")
    : null;
  if (indexedTextChanged && rowId === null)
    return c.json({ error: "not_found" }, 404);
  const statements: D1PreparedStatement[] = [];

  // listings_fts is an FTS5 external-content table. Its old tokens must be
  // removed while the old listings row is still present; a normal DELETE
  // after updating the content row can fail or leave stale search matches.
  // D1 batch() is transactional, so the listing, search index, and optional
  // photo ordering either all change together or all roll back.
  if (indexedTextChanged) {
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO listings_fts(
           listings_fts, rowid, title, description, wants
         ) VALUES ('delete', ?1, ?2, ?3, ?4)`
      ).bind(rowId!, row.title, row.description, row.wants)
    );
  }

  const assignments: string[] = [];
  const values: unknown[] = [];
  for (const [column, value] of Object.entries(upd)) {
    assignments.push(`${listingColumn(column)} = ?${values.length + 1}`);
    values.push(value);
  }
  statements.push(
    c.env.DB.prepare(
      `UPDATE listings
          SET ${assignments.join(", ")}
        WHERE id = ?${values.length + 1}`
    ).bind(...values, id)
  );

  if (indexedTextChanged) {
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO listings_fts(rowid, title, description, wants)
         VALUES (?1, ?2, ?3, ?4)`
      ).bind(
        rowId!,
        input.title?.trim() ?? row.title,
        input.description?.trim() ?? row.description,
        input.wants?.trim() ?? row.wants
      )
    );
  }

  // If the client sent an array, treat it as the authoritative photo order.
  if (input.photoKeys !== undefined) {
    statements.push(
      c.env.DB.prepare(
        "DELETE FROM listing_photos WHERE listing_id = ?1"
      ).bind(id)
    );
    input.photoKeys.forEach((key, sortOrder) => {
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO listing_photos(
             id, listing_id, r2_key, sort_order
           ) VALUES (?1, ?2, ?3, ?4)`
        ).bind(uuidv4(), id, key, sortOrder)
      );
    });
  }

  await c.env.DB.batch(statements);

  return c.json({ ok: true });
});

function listingColumn(property: string): string {
  const columns: Record<string, string> = {
    title: "title",
    description: "description",
    wants: "wants",
    category: "category",
    exchangeMode: "exchange_mode",
    condition: "condition",
    status: "status",
    postalCode: "postal_code",
    lat: "lat",
    lng: "lng",
    geohash: "geohash",
    dateModified: "date_modified",
  };
  const column = columns[property];
  if (!column) throw new Error(`Unsupported listing update field: ${property}`);
  return column;
}

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

  // Safety scan before persisting to R2. Cloudflare's CSAM Scanning Tool
  // handles CSAM at the edge; this is the second layer for NSFW / violence /
  // hate / etc. Fails OPEN on Workers AI unreachability so we don't hard-fail
  // uploads when the AI is having a bad day.
  const bytes = new Uint8Array(body);
  const mod = await classifyImage(c.env, bytes);
  if (mod.verdict === "block") {
    await logModAction(c, {
      targetType: "photo",
      targetId: key,
      actorType: "system",
      actorId: null,
      action: "ai_block",
      reason: mod.categories.join(","),
      metadata: { score: mod.score, categories: mod.categories },
    });
    return c.json(
      { error: "photo_blocked", categories: mod.categories },
      422
    );
  }
  const httpMetadata: Record<string, string> = { contentType: ct };
  const customMetadata: Record<string, string> = {
    modVerdict: mod.verdict,
    modScore: String(mod.score ?? 0),
    modCategories: mod.categories.join(",") || "-",
  };
  await c.env.PHOTOS.put(key, body, {
    httpMetadata: { contentType: httpMetadata.contentType },
    customMetadata,
  });
  return c.json({ ok: true, key, modVerdict: mod.verdict });
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
