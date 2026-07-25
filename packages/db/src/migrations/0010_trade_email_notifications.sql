-- Transactional trade alerts are enabled by default so a proposal does not
-- stall merely because its recipient is not actively browsing. Every user can
-- disable them from Account or from the signed preferences link in an email.

ALTER TABLE `users`
  ADD COLUMN `trade_email_notifications` integer NOT NULL DEFAULT 1;

-- Trade alerts are never sent until the account proves it owns the address.
ALTER TABLE `users`
  ADD COLUMN `email_verified_at` integer;
