-- Preserve the acquisition channel when a real visitor submits the private
-- contact form. The anonymous visitor id is intentionally not copied into the
-- support inbox; source, medium, and campaign are sufficient for measuring
-- which organizer and publication routes produce genuine inquiries.

ALTER TABLE `support_requests`
  ADD COLUMN `attribution_source` text;
ALTER TABLE `support_requests`
  ADD COLUMN `attribution_medium` text;
ALTER TABLE `support_requests`
  ADD COLUMN `attribution_campaign` text;

CREATE INDEX `ix_support_requests_attribution`
  ON `support_requests` (
    `attribution_source`,
    `attribution_medium`,
    `attribution_campaign`
  );
