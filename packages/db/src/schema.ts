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
    attributionVisitorId: text("attribution_visitor_id"),
    attributionSource: text("attribution_source"),
    attributionMedium: text("attribution_medium"),
    attributionCampaign: text("attribution_campaign"),
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
// growth_visits — anonymous, first-party campaign landings
// ============================================================
export const growthVisits = sqliteTable(
  "growth_visits",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    source: text("source").notNull(),
    medium: text("medium").notNull(),
    campaign: text("campaign").notNull(),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uxVisitorCampaign: uniqueIndex("ux_growth_visits_visitor_campaign").on(
      t.visitorId,
      t.campaign
    ),
    ixCampaignDate: index("ix_growth_visits_campaign_date").on(
      t.campaign,
      t.dateCreated
    ),
    ixDate: index("ix_growth_visits_date").on(t.dateCreated),
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
    listerLastReadAt: integer("lister_last_read_at"),
    requesterLastReadAt: integer("requester_last_read_at"),
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
    ixNegCreated: index("ix_negotiation_messages_created").on(
      t.negotiationId,
      t.dateCreated
    ),
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
// reports + moderation_actions
// ============================================================
export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => users.id),
    resolutionNote: text("resolution_note"),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateResolved: integer("date_resolved"),
  },
  (t) => ({
    ixTarget: index("ix_reports_target").on(t.targetType, t.targetId),
    ixStatus: index("ix_reports_status").on(t.status),
    uxUniqueReporter: uniqueIndex("ux_reports_unique_reporter").on(
      t.targetType,
      t.targetId,
      t.reporterId
    ),
  })
);

export const moderationActions = sqliteTable(
  "moderation_actions",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").references(() => users.id),
    action: text("action").notNull(),
    reason: text("reason"),
    metadata: text("metadata"),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    ixTarget: index("ix_moderation_actions_target").on(t.targetType, t.targetId),
    ixDate: index("ix_moderation_actions_date").on(t.dateCreated),
  })
);

// ============================================================
// support_requests — private public-contact inbox
// ============================================================
export const supportRequests = sqliteTable(
  "support_requests",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    topic: text("topic").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open"),
    adminNote: text("admin_note"),
    resolvedBy: text("resolved_by").references(() => users.id),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateModified: integer("date_modified")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateResolved: integer("date_resolved"),
  },
  (t) => ({
    ixStatusDate: index("ix_support_requests_status_date").on(
      t.status,
      t.dateCreated
    ),
    ixDate: index("ix_support_requests_date").on(t.dateCreated),
  })
);

// ============================================================
// blog_posts — markdown-body blog posts
// ============================================================
export const blogPosts = sqliteTable(
  "blog_posts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    bodyMd: text("body_md").notNull(),
    heroImageUrl: text("hero_image_url"),
    authorId: text("author_id").references(() => users.id),
    status: text("status").notNull().default("draft"),
    datePublished: integer("date_published"),
    isDeleted: integer("is_deleted").notNull().default(0),
    dateCreated: integer("date_created")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    dateModified: integer("date_modified")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uxSlug: uniqueIndex("ux_blog_posts_slug").on(t.slug),
    ixStatusDate: index("ix_blog_posts_status_date").on(t.status, t.datePublished),
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
