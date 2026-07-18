-- Moderation: user reports + audit trail for admin actions
--
-- reports:
--   Users flag a target (listing / blog_post / user profile) with a reason.
--   Duplicate reports from the same user against the same target are
--   deduped at the app layer.
--   Distinct-reporter count >= 3 auto-hides the target and marks the report
--   status='auto_hidden' pending admin review. Admin can then approve /
--   reject / permanently remove.
--
-- moderation_actions:
--   Append-only audit trail. Every hide / unhide / delete / restore /
--   AI-block / auto-hide writes a row so we have a defense if a user
--   claims we removed their content maliciously, and a record if law
--   enforcement subpoenas activity around a specific asset.

CREATE TABLE `reports` (
  `id` text PRIMARY KEY NOT NULL,
  `target_type` text NOT NULL,          -- 'listing' | 'blog_post' | 'user'
  `target_id` text NOT NULL,
  `reporter_id` text NOT NULL REFERENCES `users`(`id`),
  `reason` text NOT NULL,               -- csam | sexual | violence | harassment | spam | illegal | ip_infringement | other
  `notes` text,
  `status` text NOT NULL DEFAULT 'open',-- open | auto_hidden | resolved_action | resolved_no_action
  `resolved_by` text REFERENCES `users`(`id`),
  `resolution_note` text,
  `date_created` integer NOT NULL DEFAULT (unixepoch() * 1000),
  `date_resolved` integer
);
CREATE INDEX `ix_reports_target`   ON `reports` (`target_type`, `target_id`);
CREATE INDEX `ix_reports_status`   ON `reports` (`status`);
CREATE UNIQUE INDEX `ux_reports_unique_reporter`
  ON `reports` (`target_type`, `target_id`, `reporter_id`);

CREATE TABLE `moderation_actions` (
  `id` text PRIMARY KEY NOT NULL,
  `target_type` text NOT NULL,          -- 'listing' | 'blog_post' | 'user' | 'photo'
  `target_id` text NOT NULL,
  `actor_type` text NOT NULL,           -- 'admin' | 'system'
  `actor_id` text REFERENCES `users`(`id`),  -- null for 'system'
  `action` text NOT NULL,               -- hide | unhide | delete | restore | ai_block | auto_hide | approve
  `reason` text,
  `metadata` text,                       -- opaque JSON: AI scores, report ids that triggered, etc.
  `date_created` integer NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX `ix_moderation_actions_target`
  ON `moderation_actions` (`target_type`, `target_id`);
CREATE INDEX `ix_moderation_actions_date`
  ON `moderation_actions` (`date_created`);
