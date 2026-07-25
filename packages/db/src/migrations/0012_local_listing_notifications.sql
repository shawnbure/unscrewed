-- Optional retention loop for cold-start neighborhoods. This is separate from
-- transactional proposal/reply alerts and is deliberately off by default.
ALTER TABLE `users`
  ADD COLUMN `local_listing_notifications` integer NOT NULL DEFAULT 0;

-- One atomic reservation per recipient and UTC day prevents concurrent new
-- listings from producing multiple alerts. Rows are operational throttles,
-- not engagement analytics, and the sender deletes them after eight days.
CREATE TABLE `local_listing_email_deliveries` (
  `id` text PRIMARY KEY NOT NULL,
  `recipient_user_id` text NOT NULL
    REFERENCES `users`(`id`) ON DELETE CASCADE,
  `listing_id` text NOT NULL
    REFERENCES `listings`(`id`) ON DELETE CASCADE,
  `day_utc` text NOT NULL,
  `date_created` integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX
  `ux_local_listing_email_deliveries_recipient_day`
  ON `local_listing_email_deliveries` (`recipient_user_id`, `day_utc`);

CREATE INDEX
  `ix_local_listing_email_deliveries_created`
  ON `local_listing_email_deliveries` (`date_created`);
