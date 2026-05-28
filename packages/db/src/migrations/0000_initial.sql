-- Initial schema for unscrewed.lol
-- Run via: pnpm --filter @unscrewed/db migrate:local
-- (or migrate:remote for the smb-account D1 instance)

CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `email_normalized` text NOT NULL,
  `password_hash` text NOT NULL,
  `phone_e164` text NOT NULL,
  `phone_verified_at` integer,
  `display_name` text NOT NULL,
  `is_admin` integer DEFAULT 0 NOT NULL,
  `is_archived` integer DEFAULT 0 NOT NULL,
  `is_deleted` integer DEFAULT 0 NOT NULL,
  `date_created` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `date_modified` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE UNIQUE INDEX `ux_users_email_normalized` ON `users` (`email_normalized`);
CREATE INDEX `ix_users_phone` ON `users` (`phone_e164`);

CREATE TABLE `tos_acceptances` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `tos_version` text NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `date_accepted` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `ix_tos_user` ON `tos_acceptances` (`user_id`);

CREATE TABLE `sms_codes` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `purpose` text NOT NULL,
  `code_hash` text NOT NULL,
  `expires_at` integer NOT NULL,
  `consumed_at` integer,
  `attempts` integer DEFAULT 0 NOT NULL,
  `sent_to_phone_e164` text NOT NULL,
  `date_created` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `ix_sms_codes_user` ON `sms_codes` (`user_id`);
CREATE INDEX `ix_sms_codes_expires` ON `sms_codes` (`expires_at`);

CREATE TABLE `sms_log` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `direction` text NOT NULL,
  `to_number` text NOT NULL,
  `from_number` text,
  `telnyx_message_id` text,
  `status` text,
  `error_code` text,
  `error_message` text,
  `body` text,
  `date_created` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `date_modified` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `ix_sms_log_telnyx_id` ON `sms_log` (`telnyx_message_id`);
CREATE INDEX `ix_sms_log_user` ON `sms_log` (`user_id`);

CREATE TABLE `listings` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `kind` text NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `category` text NOT NULL,
  `condition` text,
  `wants` text NOT NULL,
  `postal_code` text NOT NULL,
  `country_code` text DEFAULT 'US' NOT NULL,
  `lat` real NOT NULL,
  `lng` real NOT NULL,
  `geohash` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `is_archived` integer DEFAULT 0 NOT NULL,
  `is_deleted` integer DEFAULT 0 NOT NULL,
  `date_created` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `date_modified` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `ix_listings_user` ON `listings` (`user_id`);
CREATE INDEX `ix_listings_category` ON `listings` (`category`);
CREATE INDEX `ix_listings_geohash` ON `listings` (`geohash`);
CREATE INDEX `ix_listings_status` ON `listings` (`status`);

-- FTS5 virtual table over title + description + wants
CREATE VIRTUAL TABLE `listings_fts` USING fts5(
  title, description, wants,
  content='listings', content_rowid='rowid'
);

CREATE TABLE `listing_photos` (
  `id` text PRIMARY KEY NOT NULL,
  `listing_id` text NOT NULL REFERENCES `listings`(`id`),
  `r2_key` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `width_px` integer,
  `height_px` integer,
  `size_bytes` integer,
  `date_created` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `ix_photos_listing` ON `listing_photos` (`listing_id`);

CREATE TABLE `negotiations` (
  `id` text PRIMARY KEY NOT NULL,
  `listing_id` text NOT NULL REFERENCES `listings`(`id`),
  `lister_user_id` text NOT NULL REFERENCES `users`(`id`),
  `requester_user_id` text NOT NULL REFERENCES `users`(`id`),
  `offering` text NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `is_archived` integer DEFAULT 0 NOT NULL,
  `is_deleted` integer DEFAULT 0 NOT NULL,
  `date_created` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `date_modified` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `ix_neg_listing` ON `negotiations` (`listing_id`);
CREATE INDEX `ix_neg_lister` ON `negotiations` (`lister_user_id`);
CREATE INDEX `ix_neg_requester` ON `negotiations` (`requester_user_id`);
CREATE UNIQUE INDEX `ux_neg_listing_requester` ON `negotiations` (`listing_id`, `requester_user_id`);

CREATE TABLE `negotiation_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `negotiation_id` text NOT NULL REFERENCES `negotiations`(`id`),
  `sender_user_id` text NOT NULL REFERENCES `users`(`id`),
  `body` text NOT NULL,
  `date_created` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `ix_msg_neg` ON `negotiation_messages` (`negotiation_id`);

CREATE TABLE `contracts` (
  `id` text PRIMARY KEY NOT NULL,
  `negotiation_id` text NOT NULL REFERENCES `negotiations`(`id`),
  `listing_id` text NOT NULL REFERENCES `listings`(`id`),
  `party_a_user_id` text NOT NULL REFERENCES `users`(`id`),
  `party_b_user_id` text NOT NULL REFERENCES `users`(`id`),
  `terms_json` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `party_a_signed_name` text,
  `party_a_signed_at` integer,
  `party_a_signed_ip` text,
  `party_b_signed_name` text,
  `party_b_signed_at` integer,
  `party_b_signed_ip` text,
  `tos_version_at_signing` text,
  `date_created` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `date_modified` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `ix_contract_neg` ON `contracts` (`negotiation_id`);
CREATE INDEX `ix_contract_listing` ON `contracts` (`listing_id`);
