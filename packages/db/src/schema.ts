import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================================
// users
// ============================================================
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(), // uuid
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    passwordHash: text("password_hash").notNull(), // scrypt JSON blob
    phoneE164: text("phone_e164").notNull(),
    phoneVerifiedAt: integer("phone_verified_at"), // epoch ms; null until SMS verified
    displayName: text("display_name").notNull(),
    homeZip: text("home_zip"),
    homeLat: real("home_lat"),
    homeLng: real("home_lng"),
    sessionsInvalidatedAt: integer("sessions_invalidated_at"),
    isAdmin: integer("is_admin").notNull().default(0),
    isArchived: integer("is_archived").notNull().default(0),
    isDeleted: integer("is_deleted").notNull().default(0),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateModified: integer("date_modified")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uxEmail: uniqueIndex("ux_users_email_normalized").on(t.emailNormalized),
    ixPhone: index("ix_users_phone").on(t.phoneE164),
  })
);

// ============================================================
// tos_acceptances — every signup + future ToS version bump
// ============================================================
export const tosAcceptances = sqliteTable(
  "tos_acceptances",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tosVersion: text("tos_version").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    dateAccepted: integer("date_accepted")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    ixUser: index("ix_tos_user").on(t.userId),
  })
);

// ============================================================
// listings
// ============================================================
export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(), // 'good' | 'service'
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    condition: text("condition"),
    wants: text("wants").notNull(),
    postalCode: text("postal_code").notNull(),
    countryCode: text("country_code").notNull().default("US"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    geohash: text("geohash").notNull(), // 7-char precision (~150m)
    status: text("status").notNull().default("active"), // active | traded | withdrawn
    isArchived: integer("is_archived").notNull().default(0),
    isDeleted: integer("is_deleted").notNull().default(0),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateModified: integer("date_modified")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    ixUser: index("ix_listings_user").on(t.userId),
    ixCategory: index("ix_listings_category").on(t.category),
    ixGeohash: index("ix_listings_geohash").on(t.geohash),
    ixStatus: index("ix_listings_status").on(t.status),
  })
);

// ============================================================
// listing_photos
// ============================================================
export const listingPhotos = sqliteTable(
  "listing_photos",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    r2Key: text("r2_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    sizeBytes: integer("size_bytes"),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    ixListing: index("ix_photos_listing").on(t.listingId),
  })
);

// ============================================================
// negotiations — one thread per (listing, requester)
// ============================================================
export const negotiations = sqliteTable(
  "negotiations",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    listerUserId: text("lister_user_id")
      .notNull()
      .references(() => users.id),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => users.id),
    offering: text("offering").notNull(),
    status: text("status").notNull().default("open"), // open | contract_drafted | signed | closed
    isArchived: integer("is_archived").notNull().default(0),
    isDeleted: integer("is_deleted").notNull().default(0),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateModified: integer("date_modified")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    ixListing: index("ix_neg_listing").on(t.listingId),
    ixLister: index("ix_neg_lister").on(t.listerUserId),
    ixRequester: index("ix_neg_requester").on(t.requesterUserId),
    uxPair: uniqueIndex("ux_neg_listing_requester").on(
      t.listingId,
      t.requesterUserId
    ),
  })
);

// ============================================================
// negotiation_messages
// ============================================================
export const negotiationMessages = sqliteTable(
  "negotiation_messages",
  {
    id: text("id").primaryKey(),
    negotiationId: text("negotiation_id")
      .notNull()
      .references(() => negotiations.id),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    ixNeg: index("ix_msg_neg").on(t.negotiationId),
  })
);

// ============================================================
// money_ideas + money_idea_votes
// ============================================================
export const moneyIdeas = sqliteTable(
  "money_ideas",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(), // 'trust_stack' | 'community_suggestion'
    title: text("title").notNull(),
    description: text("description").notNull(),
    priceHint: text("price_hint"),
    status: text("status").notNull().default("proposed"),
    submittedBy: text("submitted_by").references(() => users.id),
    votesUp: integer("votes_up").notNull().default(0),
    votesDown: integer("votes_down").notNull().default(0),
    isDeleted: integer("is_deleted").notNull().default(0),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateModified: integer("date_modified")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    ixKind: index("ix_money_ideas_kind").on(t.kind),
    ixStatus: index("ix_money_ideas_status").on(t.status),
  })
);

export const moneyIdeaVotes = sqliteTable(
  "money_idea_votes",
  {
    id: text("id").primaryKey(),
    ideaId: text("idea_id")
      .notNull()
      .references(() => moneyIdeas.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    vote: integer("vote").notNull(),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateModified: integer("date_modified")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uxUserIdea: uniqueIndex("ux_money_idea_votes_user_idea").on(t.userId, t.ideaId),
    ixIdea: index("ix_money_idea_votes_idea").on(t.ideaId),
  })
);

// ============================================================
// passkeys — WebAuthn credentials
// ============================================================
export const passkeys = sqliteTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    credentialId: text("credential_id").notNull(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    transports: text("transports"),
    deviceLabel: text("device_label"),
    isDeleted: integer("is_deleted").notNull().default(0),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateLastUsed: integer("date_last_used"),
  },
  (t) => ({
    uxCredential: uniqueIndex("ux_passkeys_credential_id").on(t.credentialId),
    ixUser: index("ix_passkeys_user").on(t.userId),
  })
);

// ============================================================
// contracts — immutable once signed
// ============================================================
export const contracts = sqliteTable(
  "contracts",
  {
    id: text("id").primaryKey(),
    negotiationId: text("negotiation_id")
      .notNull()
      .references(() => negotiations.id),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    partyAUserId: text("party_a_user_id") // lister
      .notNull()
      .references(() => users.id),
    partyBUserId: text("party_b_user_id") // requester
      .notNull()
      .references(() => users.id),
    termsJson: text("terms_json").notNull(), // ContractTerms
    status: text("status").notNull().default("draft"),
    partyASignedName: text("party_a_signed_name"),
    partyASignedAt: integer("party_a_signed_at"),
    partyASignedIp: text("party_a_signed_ip"),
    partyBSignedName: text("party_b_signed_name"),
    partyBSignedAt: integer("party_b_signed_at"),
    partyBSignedIp: text("party_b_signed_ip"),
    tosVersionAtSigning: text("tos_version_at_signing"),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateModified: integer("date_modified")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    ixNeg: index("ix_contract_neg").on(t.negotiationId),
    ixListing: index("ix_contract_listing").on(t.listingId),
  })
);
