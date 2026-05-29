#!/usr/bin/env node
// Generate demo seed SQL for the unscrewed.lol D1.
//
// Usage:
//   node apps/api/seeds/generate.mjs > apps/api/seeds/0001_demo.sql
//
// Then apply with:
//   pnpm --filter @unscrewed/api exec wrangler d1 execute unscrewed --remote --file ../api/seeds/0001_demo.sql
//
// Everything is keyed off a "demo:" id prefix and @demo.unscrewed.lol email
// suffix so we can find + delete it cleanly later:
//   DELETE FROM listing_photos WHERE listing_id LIKE 'demo:%';
//   DELETE FROM negotiation_messages WHERE negotiation_id LIKE 'demo:%';
//   DELETE FROM negotiations WHERE id LIKE 'demo:%';
//   DELETE FROM listings WHERE id LIKE 'demo:%';
//   DELETE FROM tos_acceptances WHERE user_id LIKE 'demo:%';
//   DELETE FROM users WHERE id LIKE 'demo:%';

import { pbkdf2Sync, randomBytes } from "node:crypto";
import ngeohash from "ngeohash";

// ---------- demo password (shared, hashed once) ----------
// All seed accounts share this password so you (or anyone) can log in to one
// to see the UI from a member's POV. Pick something obvious.
const DEMO_PASSWORD = "unscrewed-demo-2026";
const salt = randomBytes(16);
const hash = pbkdf2Sync(DEMO_PASSWORD, salt, 100000, 32, "sha256");
const PWHASH = `pbkdf2$100000$${salt.toString("base64")}$${hash.toString("base64")}`;

// ---------- US metro clusters ----------
const METROS = [
  { city: "Phoenix",   zip: "85003", lat: 33.4484, lng: -112.0740 },
  { city: "Tucson",    zip: "85701", lat: 32.2226, lng: -110.9747 },
  { city: "Austin",    zip: "78704", lat: 30.2521, lng:  -97.7559 },
  { city: "Portland",  zip: "97214", lat: 45.5152, lng: -122.6500 },
  { city: "Brooklyn",  zip: "11215", lat: 40.6700, lng:  -73.9856 },
  { city: "Asheville", zip: "28801", lat: 35.5951, lng:  -82.5515 },
  { city: "Bozeman",   zip: "59715", lat: 45.6770, lng: -111.0429 },
  { city: "Oakland",   zip: "94612", lat: 37.8044, lng: -122.2712 },
];

function jitter(base, span = 0.05) {
  return base + (Math.random() - 0.5) * span * 2;
}

// ---------- 30 demo users ----------
const PEOPLE = [
  "Lena Ortiz", "Marcus Adler", "Priya Shah", "Jordan Kim", "Wren Becker",
  "Theo Nakamura", "Imani Bell", "Soren Hayes", "Maya Fischer", "Eli Crane",
  "Nora Petrov", "Beck Hollis", "Sasha Lin", "Quinn Rivera", "Tariq Owens",
  "Iris Boone", "Calder Voss", "Dahlia Reyes", "Mateo Pratt", "Nadia Foster",
  "Wyatt Mendez", "Greta Solberg", "Idris Park", "Juno Ramos", "Aleko Vargas",
  "Mira Sato", "Hugo Marsh", "Saoirse Ellis", "Bodhi Khan", "Vera Wickham",
];

const users = PEOPLE.map((displayName, i) => {
  const slug = displayName.toLowerCase().replace(/[^a-z]+/g, ".");
  const metro = METROS[i % METROS.length];
  const id = `demo:u:${String(i + 1).padStart(2, "0")}`;
  const phone = `+1480${String(9000000 + i * 13).padStart(7, "0")}`;
  return {
    id,
    email: `${slug}@demo.unscrewed.lol`,
    emailNorm: `${slug}@demo.unscrewed.lol`,
    displayName,
    phone,
    metro,
  };
});

// ---------- listing templates ----------
// 40 listings spanning every category. (cat, kind, title, desc, wants, condition?)
// Condition omitted for services; included for goods.
const LISTINGS = [
  // electronics
  ["electronics", "good", "Vintage Marantz 2230 receiver", "Restored Marantz silver-face from the early 70s. Sounds gorgeous. Comes with bookshelf speakers.", "Mid-century furniture or a turntable upgrade", "good"],
  ["electronics", "good", "iPad Air 4 — 64GB, Wi-Fi", "Lightly used iPad, ~85% battery health. Box and charger included.", "A nice acoustic guitar or camera lens", "like_new"],
  ["electronics", "good", "Gaming PC build (RTX 3070)", "Ryzen 7 5800X, 32GB RAM, 1TB NVMe, RTX 3070. Plays everything at 1440p.", "A pickup truck or motorcycle of similar value", "good"],
  ["electronics", "good", "Sony A7 mirrorless + 28-70mm", "Full-frame mirrorless body with kit lens. Shutter count ~9k. Two batteries.", "DJ equipment or a road bike", "good"],

  // tools
  ["tools", "good", "Milwaukee M18 combo kit", "Drill, impact, sawzall, circ saw, 2 batteries + charger. Light contractor use.", "Woodworking hand tools or a router table", "good"],
  ["tools", "good", "Vintage Stanley Bedrock plane", "Type 6 No. 605. Original iron, freshly tuned. Beautiful patina.", "Cast-iron cookware or a clean chest freezer", "good"],
  ["tools", "good", "Welder — Hobart Handler 140", "MIG welder, runs on 110V. Comes with extra wire and tank.", "Snowboard setup or a kayak", "good"],

  // vehicles
  ["vehicles", "good", "2008 Trek Madone 5.2", "Carbon road bike, 56cm. New chain + cassette. Rides like new.", "Mountain bike or a winter parka", "good"],
  ["vehicles", "good", "Honda CT70 — running project", "Classic mini-bike, runs and rides. Some cosmetic work needed.", "A small camper trailer or a quality espresso machine", "fair"],
  ["vehicles", "good", "Yakima rooftop bike rack (x3)", "Three Yakima fork-mount carriers + crossbars. Fits most SUVs.", "A used canoe or a snowblower", "good"],

  // home_garden
  ["home_garden", "good", "Mid-century walnut credenza", "Refinished, original brass pulls. 6 ft long. Great condition.", "A nice rug or your old film camera", "like_new"],
  ["home_garden", "good", "Greenhouse — 8x6 polycarbonate", "Disassembled and ready to move. All hardware included.", "Help installing a deck, or carpentry work", "good"],
  ["home_garden", "good", "Le Creuset Dutch oven (7.25qt)", "Cherry red, used a handful of times. Bought at full price.", "A KitchenAid stand mixer", "like_new"],

  // clothing
  ["clothing", "good", "Filson Mackinaw wool cruiser", "Men's L, charcoal. Worn maybe a dozen times. Lifetime garment.", "Quality leather boots size 11 or a Patagonia shell", "like_new"],
  ["clothing", "good", "Vintage Levi's 501 collection", "Six pairs, all 34x32, various washes. From the 90s.", "A nice winter coat or a snowboard", "good"],

  // kids_baby
  ["kids_baby", "good", "UPPAbaby Vista stroller", "Excellent condition, original box and accessories. Outgrew it.", "A bike trailer or a contractor saw", "like_new"],
  ["kids_baby", "good", "Wooden train table + 50 pieces", "Solid maple, 4ft x 3ft. Brio + generic mix. Kid moved on.", "A pressure washer or a load of mulch", "good"],

  // sports_outdoors
  ["sports_outdoors", "good", "Pelican 100 kayak + paddle", "Sit-in, 10ft. Stable and easy. Great first kayak.", "Camping gear or a road bike", "good"],
  ["sports_outdoors", "good", "REI half dome 2+ tent", "Two-person backpacking tent. All stakes + footprint included.", "Sleeping bags or a backpacking stove", "good"],
  ["sports_outdoors", "good", "Burton Custom snowboard 158", "Rides great. Bindings included. Bought new last season.", "A pair of nice skis or split-board", "like_new"],

  // music_instruments
  ["music_instruments", "good", "Fender Mexican Telecaster", "Sunburst, maple neck. Setup by a luthier. Includes hardshell case.", "An acoustic-electric or a small tube amp", "good"],
  ["music_instruments", "good", "Yamaha P-125 digital piano", "88 weighted keys, stand and pedal included. Great practice piano.", "An electric drum kit or a violin", "like_new"],

  // books_media
  ["books_media", "good", "Box of woodworking books", "About 40 books — Krenov, Korn, Hoadley, Maloof, etc. Library quality.", "A box of fiction or a record collection", "good"],
  ["books_media", "good", "Vinyl collection (~200 LPs)", "Jazz, blues, 70s rock. All sleeved. Inquire for a list.", "A nice turntable or stereo gear", "good"],

  // labor
  ["labor", "service", "Full day of moving help", "I have a truck and a strong back. 8 hours, two-person job.", "Tutoring for my kid in algebra II", null],
  ["labor", "service", "Yard cleanup — 4 hours", "Leaves, branches, light hauling. Bring your own bags or I'll source.", "Fresh eggs, garden produce, or canned goods", null],

  // professional_services
  ["professional_services", "service", "Bookkeeping for small business", "10 years experience. QuickBooks, Xero. Up to 4 hours/month.", "Web design or branding work", null],
  ["professional_services", "service", "Family law consultation (1 hr)", "Licensed in 3 states. Initial consult only — no representation.", "Plumbing or electrical work", null],

  // skilled_trades
  ["skilled_trades", "service", "Plumbing — half day", "Licensed plumber. Fixtures, leaks, water heaters. 4 hours of work.", "Auto body repair or HVAC tune-up", null],
  ["skilled_trades", "service", "Carpentry — built-ins or shelves", "Custom shelves, closets, or built-ins. One weekend's work.", "A working motorcycle or generator", null],
  ["skilled_trades", "service", "Auto repair — brakes + tune-up", "ASE certified. I'll do brakes + a full tune-up.", "Tree work or a fence rebuild", null],

  // tutoring
  ["tutoring", "service", "SAT/ACT tutoring — 10 hours", "Recent 1560 scorer. Will tutor your high-schooler over Zoom or in person.", "Dental cleaning or 4 hours of legal advice", null],
  ["tutoring", "service", "Spanish lessons — 8 hours", "Native speaker, certified teacher. Beginner to intermediate.", "Guitar lessons or piano lessons in trade", null],

  // creative
  ["creative", "service", "Logo + brand identity package", "Designer with 12 years experience. Logo + color + type system.", "A reliable used car or a year of housecleaning", null],
  ["creative", "service", "Wedding photography (4 hours)", "Documentary style. 4 hours coverage + edited gallery.", "A great catered meal, a wood-fired oven, or carpentry work", null],
  ["creative", "service", "Custom website (5-page)", "React/Vite, deployed to your own domain. Includes one round of revisions.", "A used pickup or 6 months of weekly meal prep", null],

  // other
  ["other", "good", "Vintage Olivetti typewriter", "Working Lettera 32. Italian Olivetti, beautiful keys. With case.", "A film camera or a nice fountain pen", "good"],
  ["other", "service", "Sourdough starter + 4 lessons", "Active starter from a 6-year culture + four in-person baking lessons.", "Fresh produce or a knife sharpening setup", null],
  ["other", "service", "Bike tune-up, full overhaul", "Bearings, cables, brakes, drivetrain. As-new performance.", "A nice bottle of bourbon or whiskey, or fresh-roasted coffee monthly", null],
];

// ---------- build SQL ----------
const lines = [];
const now = Date.now();

lines.push(`-- Auto-generated demo seed — DO NOT edit by hand.`);
lines.push(`-- Generated ${new Date().toISOString()}`);
lines.push(`-- Password for all demo accounts: "${DEMO_PASSWORD}"`);
lines.push(``);

// users
lines.push(`-- USERS (${users.length})`);
for (const u of users) {
  lines.push(
    `INSERT INTO users (id, email, email_normalized, password_hash, phone_e164, phone_verified_at, display_name, is_admin, is_archived, is_deleted, date_created, date_modified) VALUES (` +
    `'${u.id}', '${u.email}', '${u.emailNorm}', '${PWHASH}', '${u.phone}', ${now}, '${u.displayName.replace(/'/g, "''")}', 0, 0, 0, ${now}, ${now});`
  );
  lines.push(
    `INSERT INTO tos_acceptances (id, user_id, tos_version, ip_address, user_agent, date_accepted) VALUES (` +
    `'demo:tos:${u.id.split(":").pop()}', '${u.id}', '2026-05-28', '127.0.0.1', 'seed-generator', ${now});`
  );
}
lines.push(``);

// listings — round-robin users
lines.push(`-- LISTINGS (${LISTINGS.length})`);
for (let i = 0; i < LISTINGS.length; i++) {
  const [category, kind, title, description, wants, condition] = LISTINGS[i];
  const owner = users[i % users.length];
  const m = owner.metro;
  const lat = jitter(m.lat, 0.06);
  const lng = jitter(m.lng, 0.06);
  const geohash = ngeohash.encode(lat, lng, 7);
  const id = `demo:l:${String(i + 1).padStart(2, "0")}`;
  const conditionSql = condition ? `'${condition}'` : "NULL";
  lines.push(
    `INSERT INTO listings (id, user_id, kind, title, description, category, condition, wants, postal_code, country_code, lat, lng, geohash, status, is_archived, is_deleted, date_created, date_modified) VALUES (` +
    `'${id}', '${owner.id}', '${kind}', '${title.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', '${category}', ${conditionSql}, '${wants.replace(/'/g, "''")}', '${m.zip}', 'US', ${lat.toFixed(6)}, ${lng.toFixed(6)}, '${geohash}', 'active', 0, 0, ${now - i * 3600_000}, ${now - i * 3600_000});`
  );
  // keep FTS in sync
  lines.push(
    `INSERT INTO listings_fts(rowid, title, description, wants) SELECT rowid, title, description, wants FROM listings WHERE id = '${id}';`
  );
}

process.stdout.write(lines.join("\n") + "\n");
