-- Private support inbox. Public submissions are Turnstile-protected and
-- rate-limited; IP addresses and user agents are deliberately not stored.

CREATE TABLE `support_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `topic` text NOT NULL,
  `message` text NOT NULL,
  `status` text NOT NULL DEFAULT 'open',
  `admin_note` text,
  `resolved_by` text REFERENCES `users`(`id`),
  `date_created` integer NOT NULL DEFAULT (unixepoch() * 1000),
  `date_modified` integer NOT NULL DEFAULT (unixepoch() * 1000),
  `date_resolved` integer
);

CREATE INDEX `ix_support_requests_status_date`
  ON `support_requests` (`status`, `date_created`);
CREATE INDEX `ix_support_requests_date`
  ON `support_requests` (`date_created`);
